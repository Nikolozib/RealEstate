import * as AOS from 'aos';

// AOS.init wrapper that keeps scroll animations disabled for users with a
// reduced-motion preference (the global stylesheet also forces [data-aos]
// elements visible as a safety net). Browser-only — every caller must stay
// behind an isPlatformBrowser guard, as AOS touches window/document.
export function initAos(options: Parameters<typeof AOS.init>[0] = {}): void {
  AOS.init({
    ...options,
    // matchMedia is absent in jsdom (unit tests), so feature-detect it.
    disable: () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
}
