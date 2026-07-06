import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast';
import { SKIP_ERROR_TOAST } from './http-context';

// Surfaces HttpClient failures as a toast so callers don't each need their
// own generic "something went wrong" handling; the error still propagates
// for any call site that needs to react to it specifically.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  if (req.context.get(SKIP_ERROR_TOAST)) return next(req);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message =
        error.status === 0
          ? 'Network error. Please check your connection.'
          : error.error?.message || 'Something went wrong. Please try again.';
      toast.error(message);
      return throwError(() => error);
    })
  );
};
