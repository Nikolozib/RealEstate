import { RenderMode, ServerRoute } from '@angular/ssr';

// Static output: everything is either baked at build time or rendered in the
// browser — there is no per-request server rendering on Netlify.
export const serverRoutes: ServerRoute[] = [
  // Prerendered shells. Home and listings load their Firestore data in the
  // browser after hydration, so the baked HTML is a fast-loading skeleton,
  // not a stale snapshot.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'listings', renderMode: RenderMode.Prerender },

  // Parameterized by Firestore ids that change without a rebuild — must
  // render client-side.
  { path: 'listings/:id', renderMode: RenderMode.Client },

  // Firebase Auth only resolves client-side, so auth-dependent pages skip
  // prerendering rather than bake a misleading logged-out shell.
  { path: 'auth/login', renderMode: RenderMode.Client },
  { path: 'auth/register', renderMode: RenderMode.Client },
  { path: 'favorites', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Prerender },
];
