import { Component, ElementRef, ViewChild, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage, N8nService } from '../../../core/services/n8n';

const GREETING =
  "Hello! I'm the RealSang assistant. Ask me anything about buying, renting, " +
  'or finding property in Georgia.';

const SESSION_KEY = 'rs-chat-session';
const HISTORY_KEY = 'rs-chat-history';

// Floating support/FAQ chat widget wired to the n8n chatbot webhook.
// Conversation state lives in sessionStorage so it survives route changes
// and reloads within a tab, but doesn't follow the visitor around forever.
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
})
export class Chatbot {
  private n8n = inject(N8nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly typing = signal(false);
  readonly failed = signal(false);

  draft = '';
  private sessionId = '';
  private lastFailedMessage = '';

  @ViewChild('messagesEl') messagesEl?: ElementRef<HTMLElement>;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.restoreSession();
    if (this.messages().length === 0) {
      this.messages.set([{ role: 'assistant', content: GREETING }]);
    }
    this.open.set(true);
    this.scrollToBottom();
    setTimeout(() => this.inputEl?.nativeElement.focus(), 50);
  }

  close(): void {
    this.open.set(false);
  }

  async send(retryText?: string): Promise<void> {
    const text = (retryText ?? this.draft).trim();
    if (!text || this.typing()) return;

    this.failed.set(false);
    if (!retryText) {
      this.messages.update(m => [...m, { role: 'user', content: text }]);
      this.draft = '';
      this.persist();
    }
    this.typing.set(true);
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
      this.typing.set(false);
      this.scrollToBottom();
    }
  }

  retry(): void {
    this.send(this.lastFailedMessage);
  }

  private restoreSession(): void {
    if (!this.isBrowser || this.sessionId) return;
    try {
      this.sessionId = sessionStorage.getItem(SESSION_KEY) ?? crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, this.sessionId);
      const saved = sessionStorage.getItem(HISTORY_KEY);
      if (saved) this.messages.set(JSON.parse(saved));
    } catch {
      // Storage unavailable (private mode etc.) — chat still works in-memory.
      if (!this.sessionId) this.sessionId = `${Date.now()}`;
    }
  }

  private persist(): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(this.messages()));
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
