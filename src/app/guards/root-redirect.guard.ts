import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const rootRedirectGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // User is logged in - redirect to patient dashboard
    return router.parseUrl('/patientdashboard');
  } else {
    // User is not logged in - redirect to login
    return router.parseUrl('/login');
  }
};