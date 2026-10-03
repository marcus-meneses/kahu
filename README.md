# Kahu


## Configuration contract

Kahu loads deployment topology from `/app-config.js` before the application bundle. The supported shape is `app: { environment, publicUrl }` and `services: { zeal: { url } }`. Blackbird generates this file; independent deployments may generate it from `config/app-config.example.js`. `VITE_SERVICE_ZEAL_URL` is a local-development/build fallback only. Production fails fast when no Zeal URL is configured. Toma is intentionally discovered through Zeal authentication and ticket responses. Never place secrets in frontend configuration.

Kahu is the customer-facing operational UI for the Enhasa/Zeal application family. It is a Vite + React application used for day-to-day pet-business workflows: dashboard, tutors, animals, storefront, schedules, and related operational screens.

Kahu does not own business persistence. Authentication and data requests are sent to Zeal, which validates Enhasa-issued tokens and exposes the resource API.

## Stack

- Vite
- React 18
- TypeScript
- Mantine UI
- React Router
- Feather icons plus Kahu's pet icon library
- Zeal HTTP API

## Runtime Shape

Default development URL:

```text
http://localhost:5173
```

The dev script binds to all interfaces so the app can be opened remotely:

```bash
npm run dev
```

Current script:

```text
vite --host 0.0.0.0 --port 5173
```

## Configuration

Kahu reads the Zeal base URL from:

```text
VITE_SERVICE_ZEAL_URL
```

Example:

```bash
VITE_SERVICE_ZEAL_URL=http://147.182.136.38:3000 npm run dev
```

If `VITE_SERVICE_ZEAL_URL` is not set:

- On `localhost` or `127.0.0.1`, Kahu uses `http://localhost:3000`.
- On a remote host, Kahu uses the current page protocol and hostname with port `3000`.

This avoids browser calls from a remote Kahu page to the user's own `localhost`.

## Commands

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Preview production build:

```bash
npm run preview
```

## Authentication

Kahu authenticates through Zeal's auth routes:

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/impersonate
```

Kahu identifies itself as the `kahu` app during login and token refresh. Enhasa enforces one active refresh session per user per authorized app, so a new Kahu login for the same user replaces the previous Kahu refresh session.

Main auth storage:

```text
localStorage["kahu.auth"]
```

Stored fields:

- access token
- refresh token
- refresh-token expiration

Impersonation storage:

```text
localStorage["kahu.impersonation"]
```

The normal SUP login remains the logged-in session. When a SUP impersonates another user, Kahu stores an impersonation access token and sends it for normal data requests. Requests that must use the real logged-in SUP session opt out of impersonation.

## Route Guard

Protected routes are wrapped by `AuthGate`.

Protected routes check login status on page load and route changes. The guard:

- redirects to `/login` when no usable session exists
- refreshes the access token when it is expired or near expiration
- retries through refresh after `401` or `403`
- loads effective KAHU and ZEAL route maps after session validation and whenever impersonation changes
- keeps a separate real-user KAHU map for the impersonation control
- redirects to `/error` for non-auth validation failures

Public routes:

```text
/login
/error
/notfound
/loggedout
```

## API Broker

Most resource calls go through `ApiBroker`.

Behavior:

- Builds requests from `VITE_SERVICE_ZEAL_URL` or the fallback Zeal URL.
- Adds `Accept: application/json`.
- Adds `Content-Type: application/json` when a body is sent.
- Adds the bearer token unless `auth: false` is requested.
- Uses the impersonation token unless `impersonate: false` is requested.
- Refreshes the main token before requests when needed.
- Refreshes impersonation tokens by renewing the main token and calling `/auth/impersonate`.
- Retries once after auth failures.
- Refuses authenticated requests absent from the effective user’s ZEAL route map before calling `fetch`.
- Emits an explicit `ApiPermissionError` and a frontend notification for denied requests.
- Exempts login, auth lifecycle, and permission-map bootstrap routes from the client map; the server still requires a valid token where applicable.

KAHU permissions use stable `module.action` operations such as `animals.view`, `tutors.details`, and `impersonation.use`. Sidebar controls consult these descriptors rather than URL strings.

## Modules And Routes

Kahu renders the main app under `/home`.

Current module routes:

```text
/home/dash
/home/tutors
/home/animals
/home/storefront
/home/veterinary
/home/grooming
/home/hotel
/home/button-showcase
```

Legacy aliases also exist for some modules, such as singular tutor/animal/product/service paths.

Deferred detail routes:

```text
/home/tutors/details
/home/animals/details
```

These routes expect a resource identifier in navigation state. If no identifier is present, the route degrades by redirecting back to the upper-level module.

## Main Workflows

Dashboard:

- Landing module at `/home/dash`.
- The Kahu logo in the sidebar navigates to the dashboard.

Tutors:

- Paginated tutor list.
- Search state persisted in session storage.
- Tutor detail modal.
- Create/edit tutor modal.
- Delete confirmation modal.
- Hierarchical city selection.
- Form validation with subtle field hints and submit-time balloons.
- CPF, phone, and postal-code display formatting while submitting unformatted data where required.
- WhatsApp contact action for Brazilian mobile phone numbers.
- Google Maps action for address data.

Animals:

- Paginated animal list.
- Search state persisted in session storage.
- Animal detail modal.
- Create/edit animal modal.
- Hierarchical species/breed selection with lazy-loaded lists.
- Tutor selection.
- Weight and size fields.
- Visual animal-size selector using vector assets in `public/icons`.
- Form validation matching tutor-form behavior.

Storefront:

- Product/service catalog view.
- Search and kind filter.
- Cart state in the module component.

Impersonation:

- SUP-only sidebar control.
- Lazy customer-to-user picker.
- Top-center overlay showing the current impersonated user or `NONE`.
- Debug modal showing frontend-loaded user/auth/impersonation context.

Button Showcase:

- Sidebar-style button showcase at `/home/button-showcase`.
- Useful when adding or validating Kahu icon/button styles.

## State Persistence

Kahu keeps short-lived UI state in:

```text
sessionStorage["kahu.moduleState"]
```

This is used for module filter/list state so switching modules does not force the user to rebuild the same search repeatedly.

Longer-lived auth/session state is kept in `localStorage`.

## Internationalization

UI strings are defined in:

```text
src/i18n/dictionaries.ts
```

Supported locales:

- `pt-BR`
- `en`

Default locale:

```text
pt-BR
```

Locale selection is stored in:

```text
localStorage["kahu.locale"]
```

Use `useI18n().t(key)` for visible UI strings instead of hard-coded text.

## PWA Metadata

Kahu includes a web app manifest:

```text
public/manifest.json
```

The manifest sets standalone/fullscreen display preferences, theme colors, scope, start URL, and icons. Browser chrome hiding still depends on how the mobile browser installs and launches the app.

## Assets

Important public assets:

```text
public/logo.svg
public/manifest.json
public/photos/
public/icons/
public/icons/size-mini.svg
public/icons/size-small.svg
public/icons/size-medium.svg
public/icons/size-large.svg
public/icons/size-giant.svg
```

The size SVGs are used by the animal-size selector.

## Source Structure

```text
src/
  main.tsx                         App providers, routes, sidebar/overlay mounting
  classes/config/Config.ts         Zeal URL, route map, auth storage helpers
  classes/brokers/LoginBroker.ts   Auth-specific broker
  classes/contexts/                User, module-state, and detail-transition contexts
  classes/themes/                  Mantine theme
  components/auth/AuthGate.tsx     Protected-route session guard
  components/animalform/           Animals module
  components/tutorform/            Tutors module
  components/storefront/           Storefront module
  components/dashboard/            Dashboard module
  components/impersonation/        SUP impersonation controls and overlay
  components/leftsidebar/          Sidebar navigation
  components/peticons/             Kahu icon components
  i18n/                            Dictionaries and translation provider
  primitives/ApiBroker.ts          Zeal request broker with token renewal
  routes/                          Route composition and error/action pages
```

## Relationship With Other Apps

- Enhasa owns login, JWT signing, refresh tokens, and impersonation token creation.
- Zeal owns resource APIs and validates Enhasa-issued JWTs.
- Kajar is the backend administration UI.
- Kahu is the operational/customer-facing UI.

## Troubleshooting

If the app calls `localhost:3000` from a remote browser, set `VITE_SERVICE_ZEAL_URL` explicitly to the server IP/host and restart Vite.

If Kahu redirects to login after navigation, inspect `localStorage["kahu.auth"]` and verify that refresh against `/auth/refresh` succeeds for app `kahu`.

If impersonated requests behave like the SUP user, inspect `localStorage["kahu.impersonation"]` and confirm the resource request did not opt out with `impersonate: false`.

If a deferred detail route opens empty, verify the navigation call provided the expected resource identifier in router state.

If mobile launch still shows browser chrome, confirm the app was opened from the installed home-screen icon and that the browser honored `public/manifest.json`.
## Norstein interaction contract

Kahu exposes rendered interactive controls through `window.__KAHU_NORSTEIN__.snapshot()`. The catalog contains only route, role, accessible label, disabled state, and interaction ID; field values and application data are never exported. Click, change, and submit events emit `kahu:norstein-interaction` for Norstein evidence.

Controls receive an automatic semantic ID. New controls whose labels may repeat or change should define `data-norstein-id="module.action"` so synthetic journeys retain a stable selector. Lazy controls and modal actions join the catalog when rendered.

## Toma real-time integration

Authenticated sessions connect with short-lived tickets. Kahu validates and deduplicates notification envelopes, ignores stale scope revisions, acknowledges accepted events, reconnects with jittered exponential backoff, and resynchronizes Kanban scopes after reconnect.

### Environment files

Local configuration uses ignored mode files: `.env.development`, `.env.test`, and `.env.production`. Select the mode with `APP_ENV` (or `NODE_ENV` as a fallback). Resolution priority is process environment, `.env.<mode>.local`, `.env.local`, `.env.<mode>`, then legacy `.env`. `.env.example` documents keys only and is never loaded. Real mode files must not be committed.
