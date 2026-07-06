import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../../environment/environment';
import { routes } from '../../app.routes';

interface RouteStubOptions {
  params?: Record<string, string>;
  data?: Record<string, unknown>;
}

// A component created directly via TestBed.createComponent (rather than
// through router navigation) gets no ActivatedRoute for free — anything
// using RouterLink, or reading route params/data/queryParams, needs one
// stubbed in. This covers both the snapshot and observable APIs so it
// works whichever style the component under test uses.
function activatedRouteStub(options: RouteStubOptions = {}) {
  const paramMap = convertToParamMap(options.params ?? {});
  return {
    snapshot: { paramMap, data: options.data ?? {} },
    paramMap: of(paramMap),
    queryParams: of({}),
    queryParamMap: of(convertToParamMap({})),
    data: of(options.data ?? {}),
  };
}

// Every component/service under core/services touches AngularFire, so this
// is the minimal provider set that satisfies DI without hitting the
// network — use it as the `providers` array in any component spec.
export function firebaseTestProviders(routeOptions: RouteStubOptions = {}): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    { provide: ActivatedRoute, useValue: activatedRouteStub(routeOptions) },
  ];
}
