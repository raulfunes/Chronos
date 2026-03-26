# Chronos MVP

Read [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) first for a compressed technical summary of the current project.

Chronos ahora es una base full-stack para productividad con:

- frontend React + Vite + TypeScript
- backend Spring Boot + JPA + JWT
- MySQL como base principal
- modo guest local y cuentas registradas
- goals, tasks, focus sessions, calendar, settings y analytics básicos
- arquitectura genérica de integraciones por usuario

## Estructura

- `src/`: app web responsive
- `backend/`: API REST Spring Boot bajo `/api/v1`

## Variables de entorno

Usa `.env.example` como referencia.

Archivos locales incluidos:

- raíz: `.env.local` para Vite
- backend: `src/main/resources/application-local.yml` para Spring Boot

Frontend:

- `VITE_API_BASE_URL=http://localhost:8082/api/v1`

Backend:

- `SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3307/chronos`
- `SPRING_DATASOURCE_USERNAME=chronos`
- `SPRING_DATASOURCE_PASSWORD=chronos`
- `CHRONOS_JWT_SECRET=chronos-super-secret-key-chronos-super-secret-key`
- `CHRONOS_INTEGRATIONS_ENCRYPTION_KEY=chronos-integration-key-chronos-integration-key`
- `CHRONOS_FRONTEND_BASE_URL=http://localhost:3000`
- `SPOTIFY_ENABLED=false`
- `SPOTIFY_CLIENT_ID=...`
- `SPOTIFY_CLIENT_SECRET=...`
- `SPOTIFY_REDIRECT_URI=http://localhost:8082/api/v1/integrations/spotify/callback`
- `SERVER_PORT=8082`

Notas de integraciones:

- `CHRONOS_INTEGRATIONS_ENCRYPTION_KEY` cifra las credenciales persistidas de providers.
- `CHRONOS_FRONTEND_BASE_URL` define la URL a la que redirige el callback OAuth cuando termina una conexión.
- Spotify queda soportado como primer provider OAuth persistente. Para habilitarlo, hay que cargar las variables y registrar el redirect URI en Spotify Developer Dashboard.
- Jira ya tiene lugar en la arquitectura genérica, pero su integración remota todavía no está implementada.

## Ejecutar localmente

### Base de datos con Docker

```bash
docker compose up -d
```

Esto levanta MySQL 8 y crea automáticamente:

- base: `chronos`
- usuario: `chronos`
- password: `chronos`
- puerto host: `3307`

phpMyAdmin también queda disponible en:

- URL: `http://localhost:8083`
- servidor: `mysql`
- usuario: `chronos`
- password: `chronos`

Si cambiaste la versión de imagen o credenciales y el volumen ya existía, recrea la base:

```bash
docker compose down -v
docker compose up -d
```

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Nota:
`mvn spring-boot:run` no lee `.env.example` automáticamente.
Si no exportas variables, Spring usará los defaults de `application.yml`.
El backend usa `8082` por defecto.
Para desarrollo local se recomienda usar el perfil `local`.

## Logging y trazabilidad

El backend ahora agrega un header `X-Request-Id` en todas las respuestas de la API.
Si el cliente ya envía `X-Request-Id`, se reutiliza; si no, el backend genera uno.

Los logs de backend incluyen ese `requestId` para poder correlacionar:

- requests HTTP resumidas
- errores manejados y no manejados
- eventos mutantes de auth, goals, tasks, sessions y settings

Para diagnosticar un fallo, tomá el `X-Request-Id` de la respuesta y buscá ese valor en la consola del backend.

## Integraciones

El backend expone un módulo genérico bajo `/api/v1/integrations` para:

- listar cuentas conectadas
- iniciar conexiones por provider
- persistir config por cuenta conectada
- refrescar credenciales
- crear y borrar vínculos N a N entre entidades Chronos y entidades externas

Rutas principales:

- `GET /api/v1/integrations`
- `GET /api/v1/integrations/{accountId}`
- `DELETE /api/v1/integrations/{accountId}`
- `POST /api/v1/integrations/{provider}/connect/start`
- `GET /api/v1/integrations/{provider}/callback`
- `POST /api/v1/integrations/{accountId}/refresh-token`
- `PATCH /api/v1/integrations/{accountId}/config`
- `GET /api/v1/integrations/{accountId}/links`
- `POST /api/v1/integrations/{accountId}/links`
- `DELETE /api/v1/integrations/{accountId}/links/{linkId}`

Estado actual:

- Settings y Focus ya consumen la arquitectura genérica de integraciones.
- Spotify ya puede persistir su conexión y su config por cuenta conectada.
- El playback embebido con Web Playback SDK todavía no está implementado; esta entrega deja lista la base de datos, APIs, cifrado y UI de configuración para construirlo encima.

## Verificación usada

```bash
npm run lint
npm run build
cd backend && mvn test
```

## Notas actuales

- El modo guest persiste sólo en `localStorage`.
- Kafka y OpenSearch no son dependencias del MVP todavía.
- El backend usa MySQL en runtime y H2 sólo para pruebas.
- El esquema ahora se versiona con Flyway en `backend/src/main/resources/db/migration`.
- El backend emite logging operativo por consola con trazabilidad por `X-Request-Id`.
- Las integraciones externas ya no viven en `user_settings`; usan tablas genéricas separadas.
- Evita volver a `ddl-auto=update`; los cambios de base deben entrar como migraciones nuevas.
- El contenedor de desarrollo está fijado en `mysql:8.0` para mantener compatibilidad simple con Flyway.
- Flyway 10 requiere el módulo `flyway-mysql` además de `flyway-core`.
