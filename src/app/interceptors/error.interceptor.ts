import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, of } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AppConfigService } from '../services/app-config.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle special case: Server returns 2xx status but JSON parsing failed
      // This happens when server returns plain text, empty body, or invalid JSON
      if (error.status >= 200 && error.status < 300) {
        // This is actually a successful response, just failed JSON parsing
        console.log('Server returned success with non-JSON response:', error.message);
        // Return proper HttpResponse to trigger next() callback
        return of(new HttpResponse({
          status: error.status,
          statusText: error.statusText,
          body: {}
        }));
      }

      let errorMessage = 'System failure. Please contact administrator.';

      // Use application configuration to determine error display
      const appConfig = inject(AppConfigService);
      
      if (appConfig.showDetailedErrors) {
        // Show full error details when running locally (IIS / development)
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          // Server-side error
          errorMessage = `Server Error Code: ${error.status}`;
          
          if (error.statusText) {
            errorMessage += ` (${error.statusText})`;
          }
          
          if (error.message) {
            errorMessage += `\nMessage: ${error.message}`;
          }

          // Handle IIS HTML error responses and all error types
          if (error.error) {
            if (typeof error.error === 'string') {
              // Plain text / HTML error response from IIS
              errorMessage += `\n\nResponse Content:\n${error.error.substring(0, 2000)}`;
            } else {
              // JSON error response
              errorMessage += `\n\nDetails:\n${JSON.stringify(error.error, null, 2)}`;
            }
          }
        }
        // Log full error object to console for debugging
        console.error('API Request Failed:', error);
        console.error('Full Error Object:', {
          url: error.url,
          status: error.status,
          statusText: error.statusText,
          headers: error.headers,
          error: error.error
        });
      }

      // Show modern toast notification
      toastService.showError(errorMessage, 6000);

      return throwError(() => new Error(errorMessage));
    })
  );
};
