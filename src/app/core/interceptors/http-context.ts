import { HttpContextToken } from '@angular/common/http';

// Set on requests to third-party endpoints (e.g. n8n webhooks) that must not
// receive the user's Firebase ID token — it's a credential and only
// first-party APIs should ever see it.
export const SKIP_AUTH_TOKEN = new HttpContextToken<boolean>(() => false);

// Set on requests whose failures the caller handles itself (inline retry UI,
// fire-and-forget notifications) so the global error toast stays quiet.
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
