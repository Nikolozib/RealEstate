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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatMessage, N8nService } from '../../../core/services/n8n';
import { AuthService, isUserVerified } from '../../../core/services/auth';

const GREETING =
  "Hello! I'm the RealSang assistant. Ask me anything about buying, renting, " +
  'or finding property in Georgia.';

const SESSION_KEY_PREFIX = 'rs-chat-session:';
const HISTORY_KEY_PREFIX = 'rs-chat-history:';

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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly user = toSignal(this.auth.currentUser$);
  // Unverified sessions count as signed-out, matching the rest of the UI.
  private readonly uid = computed(() => {
    const u = this.user() ?? null;
    return isUserVerified(u) ? u!.uid : null;
  });
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

    this.failed.set(false);
    if (!retryText) {
      this.messages.update(m => [...m, { role: 'user', content: text }]);
      this.draft = '';
      this.persist();
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
  linkify(content: string): { text: string; href?: string }[] {
    const parts: { text: string; href?: string }[] = [];
    const urlPattern = /https?:\/\/[^\s]+/g;
    let cursor = 0;
    for (const match of content.matchAll(urlPattern)) {
      const index = match.index ?? 0;
      const url = match[0].replace(/[.,!?)]+$/, '');
      if (index > cursor) parts.push({ text: content.slice(cursor, index) });
      parts.push({
        text: url.includes('/listings/') ? 'View listing' : url.replace(/^https?:\/\//, ''),
        href: url,
      });
      cursor = index + url.length;
    }
    if (cursor < content.length) parts.push({ text: content.slice(cursor) });
    return parts;
  }
}
