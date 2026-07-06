import { ErrorHandler, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../services/toast';

// Catches errors that escape all other handling (template errors, promise
// rejections, chunk-load failures) so the user sees a friendly toast instead
// of a silently broken page. HTTP failures are excluded — errorInterceptor
// already toasts those, and toasting twice for one failure is worse than once.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  handleError(error: unknown): void {
    console.error('Unhandled error:', error);

    if (!this.isBrowser || this.isHttpError(error)) return;

    try {
      this.toast.error('Something went wrong. Please try again.');
    } catch {
      // The error handler must never itself throw.
    }
  }

  private isHttpError(error: unknown): boolean {
    // Async errors arrive wrapped: { rejection: <original error> }.
    const unwrapped =
      error && typeof error === 'object' && 'rejection' in error
        ? (error as { rejection: unknown }).rejection
        : error;
    return unwrapped instanceof HttpErrorResponse;
  }
}
