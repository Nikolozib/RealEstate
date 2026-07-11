import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatMessage, N8nService } from '../../../core/services/n8n';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../environment/environment';

const GREETING =
  "Hello! I'm the RealSang assistant. Ask me anything about buying, renting, " +
  'or finding property in Georgia.';

const SESSION_KEY_PREFIX = 'rs-chat-session:';
const HISTORY_KEY_PREFIX = 'rs-chat-history:';

// Answer cache for conversation-opening questions (shared across users —
// FAQ answers aren't personal). Short TTL because the bot recommends
// listings, and those change without notice.
const CACHE_KEY = 'rs-chat-cache';
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;

// After this long without a reply, the thinking indicator switches to a
// reassurance message — the n8n instance cold-starts in ~50s, and users
// otherwise assume the bot is broken.
const SLOW_REPLY_MS = 8_000;

// Floating support/FAQ chat widget wired to the n8n chatbot webhook.
// Chatting requires a verified account (same gate the header uses), and each
// user gets their own conversation: history and the n8n session id are keyed
// by Firebase uid in localStorage, so accounts never share a thread.
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
})
export class Chatbot {
  private n8n = inject(N8nService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Hosts whose links the widget navigates in-app instead of opening a new
  // tab. The configured site host covers bot replies that always use the
  // production origin; the current host covers whatever origin the app is
  // actually served from (localhost, previews).
  private readonly internalHosts = new Set(
    [new URL(environment.siteUrl).host, this.isBrowser ? location.host : null].filter(
      (h): h is string => !!h,
    ),
  );

  // Unverified sessions count as signed-out, matching the rest of the UI.
  // The verified check must happen inside the pipe, per emission: Firebase
  // flips emailVerified by mutating the user object in place and then
  // re-emits that same reference, which a signal would drop as "unchanged"
  // — a computed() over the raw user object never re-runs after verification.
  private readonly uid = toSignal(
    this.auth.currentUser$.pipe(map(u => (u && u.emailVerified ? u.uid : null))),
    { initialValue: null },
  );
  readonly signedIn = computed(() => this.uid() !== null);

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly typing = signal(false);
  readonly slowReply = signal(false);
  readonly failed = signal(false);

  draft = '';
  private loadedUid: string | null = null;
  private sessionId = '';
  private lastFailedMessage = '';
  private slowTimer: ReturnType<typeof setTimeout> | undefined;

  @ViewChild('messagesEl') messagesEl?: ElementRef<HTMLElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  constructor() {
    // Swap conversations when the account changes (login, logout, switch):
    // the previous user's thread must never bleed into the next one.
    effect(() => {
      const uid = this.uid();
      if (uid === this.loadedUid) return;
      this.loadedUid = null;
      this.sessionId = '';
      this.lastFailedMessage = '';
      this.messages.set([]);
      this.failed.set(false);
      if (uid && this.open()) this.loadConversation();
    });
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    if (this.signedIn()) this.loadConversation();
    this.open.set(true);
    this.scrollToBottom();
    setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
  }

  close(): void {
    this.open.set(false);
  }

  async send(retryText?: string): Promise<void> {
    const text = (retryText ?? this.draft).trim();
    if (!text || this.typing() || !this.signedIn()) return;

    // Only conversation-opening questions hit the cache — a follow-up's
    // answer depends on context a shared question→answer cache can't hold.
    const standalone = !this.messages().some(m => m.role === 'user');
    const cacheKey = text.toLowerCase().replace(/\s+/g, ' ');

    this.failed.set(false);
    if (!retryText) {
      this.messages.update(m => [...m, { role: 'user', content: text }]);
      this.draft = '';
      this.persist();
    }

    if (standalone) {
      const cached = this.cacheGet(cacheKey);
      if (cached) {
        this.messages.update(m => [...m, { role: 'assistant', content: cached }]);
        this.persist();
        this.scrollToBottom();
        return;
      }
    }

    this.typing.set(true);
    this.slowReply.set(false);
    this.slowTimer = setTimeout(() => this.slowReply.set(true), SLOW_REPLY_MS);
    this.scrollToBottom();

    try {
      // Contract: `history` is the prior conversation only — the message
      // being answered travels separately in `message`.
      const history = this.messages().slice(0, -1);
      const reply = await this.n8n.chat(this.sessionId, text, history);
      this.messages.update(m => [...m, { role: 'assistant', content: reply }]);
      if (standalone) this.cacheSet(cacheKey, reply);
      this.persist();
    } catch (err) {
      console.warn('Chat webhook failed:', err);
      this.lastFailedMessage = text;
      this.failed.set(true);
    } finally {
      clearTimeout(this.slowTimer);
      this.typing.set(false);
      this.slowReply.set(false);
      this.scrollToBottom();
    }
  }

  private cacheGet(question: string): string | null {
    if (!this.isBrowser) return null;
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
      const entry = cache[question];
      if (entry && Date.now() - entry.t < CACHE_TTL_MS) return entry.a;
    } catch {
      // Corrupt or unavailable cache is never worth an error.
    }
    return null;
  }

  private cacheSet(question: string, answer: string): void {
    if (!this.isBrowser) return;
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
      cache[question] = { a: answer, t: Date.now() };
      const keys = Object.keys(cache);
      if (keys.length > CACHE_MAX_ENTRIES) {
        keys
          .sort((x, y) => cache[x].t - cache[y].t)
          .slice(0, keys.length - CACHE_MAX_ENTRIES)
          .forEach(k => delete cache[k]);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Best-effort only.
    }
  }

  retry(): void {
    this.send(this.lastFailedMessage);
  }

  // Loads (or starts) the signed-in user's own conversation. localStorage —
  // not sessionStorage — so the thread follows the account across tabs and
  // visits on this device. The session id is minted once per user and reused,
  // which keys the n8n workflow's memory per user too.
  private loadConversation(): void {
    const uid = this.uid();
    if (!this.isBrowser || !uid || this.loadedUid === uid) return;
    this.loadedUid = uid;
    const sessionKey = SESSION_KEY_PREFIX + uid;
    try {
      this.sessionId = localStorage.getItem(sessionKey) ?? `${uid}-${crypto.randomUUID()}`;
      localStorage.setItem(sessionKey, this.sessionId);
      const saved = localStorage.getItem(HISTORY_KEY_PREFIX + uid);
      if (saved) this.messages.set(JSON.parse(saved));
    } catch {
      // Storage unavailable (private mode etc.) — chat still works in-memory.
      if (!this.sessionId) this.sessionId = `${uid}-${Date.now()}`;
    }
    if (this.messages().length === 0) {
      this.messages.set([{ role: 'assistant', content: GREETING }]);
    }
  }

  private persist(): void {
    const uid = this.uid();
    if (!this.isBrowser || !uid) return;
    try {
      localStorage.setItem(HISTORY_KEY_PREFIX + uid, JSON.stringify(this.messages()));
    } catch {
      // Best-effort only.
    }
  }

  private scrollToBottom(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // Splits a message into text and link segments so the template can render
  // URLs as real anchors (the bot recommends listings by link). Trailing
  // punctuation stays outside the link so "…/listings/abc." doesn't 404.
  // Links into this site also carry `path`, so clicks become in-app router
  // navigations (the chat panel survives them) instead of opening a new tab.
  linkify(content: string): { text: string; href?: string; path?: string }[] {
    const parts: { text: string; href?: string; path?: string }[] = [];
    const urlPattern = /https?:\/\/[^\s]+/g;
    let cursor = 0;
    for (const match of content.matchAll(urlPattern)) {
      const index = match.index ?? 0;
      const url = match[0].replace(/[.,!?)]+$/, '');
      if (index > cursor) parts.push({ text: content.slice(cursor, index) });
      parts.push({
        text: url.includes('/listings/') ? 'View listing' : url.replace(/^https?:\/\//, ''),
        href: url,
        path: this.toInternalPath(url),
      });
      cursor = index + url.length;
    }
    if (cursor < content.length) parts.push({ text: content.slice(cursor) });
    return parts;
  }

  private toInternalPath(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      if (this.internalHosts.has(parsed.host)) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // Not a parseable URL — leave it as a plain external href.
    }
    return undefined;
  }

  // In-app links keep their real href (right-click, ctrl/middle-click still
  // open tabs), but a plain click routes through the SPA so the page swaps
  // underneath while the chat panel stays open.
  openLink(event: MouseEvent, path: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    this.router.navigateByUrl(path);
  }
}
