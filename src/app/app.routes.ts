import { Routes } from '@angular/router';
import { Patientdashboard } from '../pages/patientdashboard/patientdashboard';
import { Patientform } from '../pages/patientform/patientform';
import { Login } from '../Pages/login/login';
import { authGuard } from './guards/auth.guard';
import { rootRedirectGuard } from './guards/root-redirect.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'patientdashboard', component: Patientdashboard, canActivate: [authGuard] },
  { path: 'patientform', component: Patientform, canActivate: [authGuard] },

  { path: '', component: Login, canActivate: [rootRedirectGuard] }
];
