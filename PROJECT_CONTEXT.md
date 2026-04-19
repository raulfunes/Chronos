# PROJECT_CONTEXT

## Purpose
Quick, low-token context file for any AI or engineer joining the project.
Read this before scanning the repo.
If this file conflicts with the code, the code is source of truth and this file must be updated.

## Product Summary
Chronos is a productivity app focused on:

- Pomodoro-style focus sessions, including local custom schedules
- Goals and tasks linked to those sessions
- Calendar visibility for scheduled/completed sessions, including a month-grid performance archive
- Basic analytics
- Registered users plus guest mode

Current scope is MVP only.
No AI-driven features, payments, collaboration, Kafka-critical flows, or OpenSearch-critical flows are implemented.

## Current Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router

### Backend
- Java 21
- Spring Boot 3
- Spring Security + JWT
- Spring Data JPA
- Flyway
- Flyway MySQL module
- MySQL 8.0 for runtime/dev container
- H2 for tests

## Repo Layout
- `src/`: frontend app
- `backend/`: Spring Boot API
- `README.md`: setup and run instructions
- `.env.example`: env var reference
- `.env.local`: local Vite config
- `backend/src/main/resources/application-local.yml`: local Spring profile

## Frontend Shape
- `src/App.tsx`: top-level routing and auth gating
- `src/components/focus/`: extracted focus UI pieces for single timer, custom builder, custom runner, and the custom-schedule help tooltip
- `src/components/shared/EntityEditorModal.tsx`: shared modal used for goal/task create, edit, and delete confirmation flows
- `src/lib/chronos-context.tsx`: main app state, auth state, guest mode state, CRUD orchestration
- `src/lib/use-focus-session-controller.ts`: focus-page controller hook that owns timer/custom-flow behavior
- `src/lib/use-spotify-playback.ts`: Spotify Web Playback SDK loader, browser-player lifecycle, playlist fetch, and playback controls for the Focus page
- `src/lib/focus-session-shared.ts`: shared focus-mode constants, helper formatting, and custom-schedule UI types
- `src/lib/ambient-audio.ts`: procedural ambient audio engine for browser playback via Web Audio API
- `src/lib/api.ts`: backend API client
- `src/lib/storage.ts`: localStorage auth and guest persistence
- `src/pages/`:
  - `AuthPage.tsx`
  - `FocusPage.tsx`
  - `GoalsPage.tsx`
  - `CalendarPage.tsx` (client-derived monthly archive view with month/year quick filters, modal day detail, full-width main panel, and a capped right-rail insights column)
  - `SettingsPage.tsx`

Guest mode is local-only and persists in `localStorage`.
Registered users use the backend API.

## Backend Shape
Base package: `com.chronos.api`

Main modules:
- `auth`
- `user`
- `goal`
- `task`
- `session`
- `calendar`
- `settings`
- `integration`
- `analytics`
- `common`
- `config`

API base path: `/api/v1`

Implemented endpoint groups:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/guest`
- `GET /me`
- CRUD for `/goals`
- CRUD for `/tasks`
- CRUD for `/sessions`
- `POST /sessions/{id}/complete`
- `GET /calendar`
- `GET/PATCH /settings`
- generic integration routes under `/integrations`
- `GET /analytics/summary`

## Core Domain Model
- `AppUser`: registered user or guest role
- `Goal`: high-level outcome
- `TaskItem`: unit of work, optionally linked to a goal
- `FocusSession`: Pomodoro/break session, optionally linked to goal/task
- `UserSettings`: timer presets and experience settings
- `IntegrationAccount`: provider account linked to a Chronos user, with provider config and encrypted credentials
- `IntegrationLink`: generic N:N link between Chronos entities and external entities
- `IntegrationSyncState`: provider sync cursor and metadata state

Key rule:
- Completing a session linked to a task marks that task as `DONE`.
- Deleting a goal or task detaches optional child references instead of deleting historical tasks or focus sessions.
- Skipped pomodoro sessions are terminal records that preserve rounded worked minutes without marking linked tasks as done.
- Focus sessions now persist timer progress through `remainingSeconds` and `lastResumedAt`, and support `PAUSED` state.
- External integrations are persisted outside `user_settings`; settings only retain Chronos-native preferences.
- Audio session preferences are local browser state and are no longer part of the backend `user_settings` contract.
- Focus audio preferences (ambient choice, local Spotify playlist choice, audio scope, per-browser enable/volume) are stored in browser localStorage, scoped by guest or authenticated user id.

## Important Runtime Behavior
- Frontend expects backend at `VITE_API_BASE_URL`, default `http://localhost:8082/api/v1`
- Backend uses MySQL on `localhost:3307` by default unless env vars override it
- Backend uses port `8082` by default unless `SERVER_PORT` overrides it
- Local development should prefer Spring profile `local`
- Backend tests use H2
- Database schema is managed by Flyway migrations in `backend/src/main/resources/db/migration`
- CORS is enabled for localhost frontend development
- JWT protects all API routes except auth endpoints
- The focus timer can be paused and resumed without resetting elapsed countdown; reset deletes the in-progress session draft
- Persisted frontend auth survives page reloads unless the backend returns an actual auth failure (`401`/`403`)
- Authenticated frontend bootstrap refreshes domain data once per real auth/token change, avoiding repeated request loops on initial load
- Active focus sessions are recoverable after reload/browser close for both registered and guest users
- If a recovered running session has already expired, the app completes it automatically on reopen
- Custom schedules on the Focus page are local-only builder flows with a two-step UX: build the sequence in the main panel, then run it in the timer view
- The custom-schedule builder supports drag-reordering blocks from the numbered handle, dropping them into the existing insertion lanes between steps
- Custom schedule plans are not persisted or recovered; only finished pomodoro blocks are saved as session records
- Skipping a custom pomodoro persists a `SKIPPED` session with rounded worked minutes when that rounded value is at least one minute; breaks never persist
- Custom schedules now insert a 3-second interstitial countdown between consecutive blocks, with transition cues that respect the session-audio toggle and temporarily duck in-app ambient audio
- Focus sessions now play lightweight browser-generated cues when a new session/block starts and when a session fully ends; intermediate custom-block handoffs still use the dedicated transition chime/countdown instead of a duplicate end cue
- Focus analytics count both `COMPLETED` and `SKIPPED` pomodoro minutes, while completed-session counts and streaks still use only `COMPLETED`
- The Calendar page now hides the shared shell `TopBar`, derives its compact month grid and modal day-detail flow from full `sessions` history using `completedAt ?? scheduledFor ?? startedAt ?? createdAt`, and uses a capped desktop right-rail insights column while the month grid expands across the remaining shell width; the `/calendar` API remains available but is not the primary data source for that screen
- The authenticated desktop app shell is rendered at a 90% visual scale from the `xl` breakpoint upward to preserve roomier spacing without relying on browser zoom
- Frontend errors are surfaced through a transient global toast centered over the active content area, with subtle motion/shadow and auto-dismiss after roughly 1.5 seconds, including auth-route failures
- Goals uses a split board with a left-side filter rail, right-side goal/task results, compact top create buttons, a `Goals`/`Tasks` view toggle, status/relationship filtering, and default newest-first ordering scoped to `IN_PROGRESS`
- On desktop focus layout, global page scroll is suppressed so the main timer panel fits the viewport and only the right-side settings column scrolls
- The authenticated desktop sidebar is collapsible, and its collapsed/expanded state is stored locally in browser localStorage
- Focus controls use stronger hover/active/disabled cues (including cursor changes, animated toggle/button states, and non-interactive lock styling for disabled relinking controls)
- Focus UI keeps dark-themed native form controls, truncates long sidebar identity text with hover reveal, and uses a single proportioned aspect-ratio timer disc to preserve the circular centerpiece
- The focus audio panel now lets authenticated users load Spotify playlists, enable the browser player once, adjust Spotify volume locally, and control playback from both the drawer and the floating mini-player using the real Spotify brand icon via `react-icons`
- Backend responses now include `X-Request-Id`; incoming values are reused and otherwise generated server-side
- Backend logs include operational request/error tracing and business-event logs for auth and write operations
- Registered users can persist external integration accounts in the backend; guest mode exposes no remote integrations
- Spotify OAuth persistence is wired through the generic integration module, and Focus now uses the browser-side Web Playback SDK plus token refresh to play the selected playlist inside the app
- Ambient defaults (`RAIN`, `RIVER`, `WHITE_NOISE`) are generated client-side with the Web Audio API and can be previewed in settings or played during active focus sessions
- Focus page is the operational control surface for session audio; Settings now only keeps global Chronos preferences plus integration account connection management
- Frontend TypeScript checks are scoped to the app sources (`src/` plus `vite.config.ts`) so repo-local skill examples do not break the app lint command

## Commands

### Database
```bash
docker compose up -d
```

phpMyAdmin runs at `http://localhost:8083`.

### Frontend
```bash
npm install
npm run dev
npm run lint
npm run build
```

### Backend
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
mvn test
```

## Known Limitations
- Guest data is not synced to server
- Spotify browser playback still depends on Spotify Premium plus a user gesture to activate the browser player in autoplay-restricted browsers
- Ambient sound quality depends on browser Web Audio support and user gesture/autoplay policies
- No realtime
- Kafka and OpenSearch are planned extensions only, not active dependencies

## Working Rules For Future AI Agents
- Do not reintroduce mock-only UI flows when real domain state exists.
- Preserve the current product direction: MVP productivity app, not AI-first.
- Keep frontend and backend contracts aligned. If one changes, update the other in the same task.
- Prefer extending existing modules over creating parallel duplicated flows.
- Keep guest mode working unless explicitly removed.
- Update `README.md` when setup or run instructions change.

## Mandatory Update Rule
When making meaningful changes, update this file in the same task.

You must update `PROJECT_CONTEXT.md` if you change any of these:
- stack or major dependency choices
- repo structure
- API routes or contracts
- auth model
- main domain entities or business rules
- environment variables
- startup/build/test commands
- implemented product scope
- known limitations that are no longer true

Minimum update standard:
- keep sections short
- remove stale statements, do not only append
- prefer current truth over historical notes
