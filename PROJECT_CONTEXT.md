# PROJECT_CONTEXT

## Purpose
Quick, low-token context file for any AI or engineer joining the project.
Read this before scanning the repo.
If this file conflicts with the code, the code is source of truth and this file must be updated.

## Product Summary
Chronos is a productivity app focused on:

- Pomodoro-style focus sessions
- Goals and tasks linked to those sessions
- Calendar visibility for scheduled/completed sessions
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
- `src/lib/chronos-context.tsx`: main app state, auth state, guest mode state, CRUD orchestration
- `src/lib/api.ts`: backend API client
- `src/lib/storage.ts`: localStorage auth and guest persistence
- `src/pages/`:
  - `AuthPage.tsx`
  - `FocusPage.tsx`
  - `GoalsPage.tsx`
  - `CalendarPage.tsx`
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
- Focus sessions now persist timer progress through `remainingSeconds` and `lastResumedAt`, and support `PAUSED` state.
- External integrations are persisted outside `user_settings`; settings only retain Chronos-native preferences.

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
- Backend responses now include `X-Request-Id`; incoming values are reused and otherwise generated server-side
- Backend logs include operational request/error tracing and business-event logs for auth and write operations
- Registered users can persist external integration accounts in the backend; guest mode exposes no remote integrations
- Spotify OAuth persistence is wired through the generic integration module, but embedded playback is not implemented yet

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
- Spotify playback inside the app is not implemented yet; current work covers persistence, config, and integration APIs
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
