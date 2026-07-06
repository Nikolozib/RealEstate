import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environment/environment';
import { SKIP_AUTH_TOKEN, SKIP_ERROR_TOAST } from '../interceptors/http-context';

export type LeadType = 'contact' | 'property_inquiry';

export interface Lead {
  type: LeadType;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  propertyId: string;
  propertyTitle: string;
  propertyUrl: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Client for the n8n automation webhooks (lead notifications, admin alerts,
// support chatbot). All three endpoints share the same contract: POST JSON
// with an X-Webhook-Token header; requests without it are rejected with 403.
@Injectable({ providedIn: 'root' })
export class N8nService {
  private http = inject(HttpClient);

  // The n8n instance runs on Render's free tier — a cold start can hold a
  // request for ~50s, so anything shorter would fail exactly when the
  // server is waking up.
  private static readonly TIMEOUT_MS = 90_000;

  private readonly headers = { 'X-Webhook-Token': environment.n8n.token };

  // n8n must never see the user's Firebase ID token, and callers of these
  // webhooks handle failures themselves (or deliberately ignore them).
  private readonly context = new HttpContext()
    .set(SKIP_AUTH_TOKEN, true)
    .set(SKIP_ERROR_TOAST, true);

  // Emails the site owner (and logs to the leads sheet) — a notification on
  // top of the Firestore inquiry, not a replacement for it. Callers should
  // treat failures as non-fatal: the lead is already saved.
  sendLead(lead: Lead): Promise<unknown> {
    return firstValueFrom(
      this.http
        .post(
          environment.n8n.leadUrl,
          { ...lead, submittedAt: new Date().toISOString() },
          { headers: this.headers, context: this.context },
        )
        .pipe(timeout(N8nService.TIMEOUT_MS)),
    );
  }

  sendAdminAlert(event: string, detail: string): Promise<unknown> {
    return firstValueFrom(
      this.http
        .post(
          environment.n8n.adminAlertUrl,
          { event, detail, submittedAt: new Date().toISOString() },
          { headers: this.headers, context: this.context },
        )
        .pipe(timeout(N8nService.TIMEOUT_MS)),
    );
  }

  // Synchronous chat round-trip. `history` must be the full prior
  // conversation (the workflow uses it for context); the new message goes
  // in `message`, not in the history.
  async chat(sessionId: string, message: string, history: ChatMessage[]): Promise<string> {
    const res = await firstValueFrom(
      this.http
        .post<{ reply: string }>(
          environment.n8n.chatUrl,
          { sessionId, message, history },
          { headers: this.headers, context: this.context },
        )
        .pipe(timeout(N8nService.TIMEOUT_MS)),
    );
    if (!res?.reply) throw new Error('Chat webhook returned no reply.');
    return res.reply;
  }
}
