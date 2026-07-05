import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withRouterConfig,
  withPreloading,
  withInMemoryScrolling,
  PreloadAllModules,
} from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { environment } from './environment/environment';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authTokenInterceptor } from './core/interceptors/auth-token-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authTokenInterceptor, errorInterceptor])),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideClientHydration(withEventReplay()),
  ],
};
