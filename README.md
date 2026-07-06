# RealEstate Georgia

A real estate listings platform for Georgia (Tbilisi, Batumi, and beyond) — browse, search, and save
properties, contact agents, and manage listings from an admin panel. Built with Angular (standalone
components, signals-friendly, zoneless) and Firebase (Auth, Firestore).

[![Netlify Status](https://api.netlify.com/api/v1/badges/d790dce9-40a0-417e-8adf-3c2a324731b4/deploy-status)](https://app.netlify.com/projects/realsang/deploys)

## Stack

- **Angular 21** — standalone components, lazy-loaded routes, SSR (`@angular/ssr`) with hydration
- **Firebase** — Authentication (email/password + verification), Firestore (properties, users, inquiries)
- **Vitest** — unit tests via `@angular/build:unit-test`
- **AOS** — scroll animations

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

The app expects a Firebase project with **Authentication** (Email/Password provider) and
**Firestore** enabled. Firebase web config lives in:

- `src/app/environment/environment.ts` — development
- `src/app/environment/environment.prod.ts` — production build (swapped in via `angular.json`
  `fileReplacements`)

Both also set `siteUrl`, used to build canonical URLs and structured data — update it if you deploy
to a different domain.

Firebase config values (`apiKey`, `authDomain`, etc.) are public client identifiers, not secrets —
safe to commit. Get them from **Firebase Console → Project Settings → General → Your apps**.

### 3. Deploy Firestore/Storage security rules

Rules live in `firestore.rules` and `storage.rules` at the repo root, referenced by `firebase.json`.
Deploy them with the [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select this project once
firebase deploy --only firestore:rules,storage:rules
```

### 4. Run the dev server

```bash
npm start
```

Visit `http://localhost:4200/`. The app reloads automatically on file changes.

## Building

```bash
npm run build
```

Outputs to `dist/RealEstate/`:
- `dist/RealEstate/browser` — static client bundle
- `dist/RealEstate/server` — SSR server bundle (`server.mjs`)

To run the SSR server locally against a production build:

```bash
npm run build
node dist/RealEstate/server/server.mjs
```

Serves on `http://localhost:4000` by default (override with `PORT`).

## Testing

```bash
npm test
```

Runs the Vitest-based unit test suite (components, guards, services, validators, pagination
helpers). Component specs that touch Firebase-backed services initialize a real (but offline)
Firebase app via `src/app/core/testing/test-providers.ts` — no emulator required for the current
suite, but note that a few specs (e.g. `listings`, `home`) call live Firestore reads.

## n8n integration (leads, alerts, chatbot)

Three n8n workflows (hosted on Render) power the site's automation, called directly from the
browser as `POST` webhooks with an `X-Webhook-Token` header:

- **Lead notifications** — the contact form and property inquiry form email the owner (and log to
  a Google Sheet) via `webhook/lead`, *in addition to* saving the inquiry in Firestore. Webhook
  failures are non-fatal: the Firestore save is the source of truth.
- **Admin alerts** — `webhook/admin-alert` fires on new user registration.
- **Chatbot** — the floating support widget (bottom-right on every page) chats through
  `webhook/chat`, sending the full conversation history each turn.

URLs and the token live in `src/app/environment/environment*.ts` under `n8n`. The token is a
public client-side identifier (like the Firebase config), not a secret. The n8n server runs on
Render's free tier — a cold start can delay a response by ~50s, so the client uses a 90s timeout
and the chatbot shows a retry prompt on failure.

## Deployment (Netlify)

This project deploys to Netlify with SSR enabled via the `@netlify/angular-runtime` build plugin
(see `netlify.toml`). Netlify runs `npm run build` and serves both the static `browser` output and
the SSR bundle automatically.

If you fork this repo and connect your own Netlify site, verify in the Netlify dashboard that:
- The build command is `npm run build` and publish directory is `dist/RealEstate/browser`.
- The `@netlify/angular-runtime` plugin is installed (Netlify offers to add it automatically when
  it detects `@angular/ssr` in `package.json`).

## Project structure

```
src/app/
  Components/        Feature + shared UI components (pages, header/footer, toast)
  core/
    guards/           authGuard, adminGuard, guestGuard, property resolver
    interceptors/      Auth token attach + global HTTP error toast
    services/          Firebase-backed services (Auth, User, Property, Inquiry, Seo, Toast)
    utils/              Validation, reactive form validators, pagination helpers
    testing/            Shared TestBed providers for specs
  environment/         Firebase config per build configuration
```

## Additional Resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [AngularFire documentation](https://github.com/angular/angularfire)
