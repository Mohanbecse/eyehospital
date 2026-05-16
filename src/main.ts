import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { jwtInterceptor } from './app/interceptors/jwt.interceptor';
import { loadingInterceptor } from './app/interceptors/loading.interceptor';
import { errorInterceptor } from './app/interceptors/error.interceptor';
import { AppConfigService } from './app/services/app-config.service';

export function initializeApp(appConfig: AppConfigService) {
  return () => appConfig.loadConfig();
}

bootstrapApplication(App, {
   providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
     provideHttpClient(
       withInterceptors([jwtInterceptor, loadingInterceptor, errorInterceptor]),
       withInterceptorsFromDi()
     ),
    AppConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppConfigService],
      multi: true
    }
  ]
});
