import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static/marketing pages — safe to prerender at build time.
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },

  // Firestore-backed pages — content changes without a rebuild, so render
  // per-request instead of baking in a stale snapshot.
  { path: '', renderMode: RenderMode.Server },
  { path: 'listings', renderMode: RenderMode.Server },
  { path: 'listings/:id', renderMode: RenderMode.Server },

  // Firebase Auth only resolves client-side, so auth-dependent pages skip
  // SSR entirely rather than render a misleading logged-out shell.
  { path: 'auth/login', renderMode: RenderMode.Client },
  { path: 'auth/register', renderMode: RenderMode.Client },
  { path: 'favorites', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Prerender },
];
