
# Job-Tracker
Full-stack job application tracker built with React and FastAPI.
=======
# JobTrack

JobTrack is a full-stack job search tracker built as a Python and React
portfolio project. It helps a signed-in user organize job applications,
schedule interviews, and review application activity in a dashboard.

> **Demo:** [Live application](https://your-live-demo-url.example) ·
> **Source:** [GitHub repository](https://github.com/your-username/your-repository)
>
> Replace these placeholders with the actual public URLs when available.

## Features

- Account registration, login, logout, and authenticated session checks.
- Application create, list, detail, update, and delete workflows.
- Application search by company or job title; status and employment-type
  filters; sorting by company or application date; and server-side pagination.
- Interview scheduling, listing, date-range filtering, editing, and deletion.
- Dashboard summary cards, application status and monthly trend charts, and
  upcoming interviews, populated from the API.
- User-scoped application, interview, and analytics data.
- Validated request/response schemas, safe API error responses, and database
  schema migrations.

Application statuses are `saved`, `applied`, `interviewing`, `offer`,
`rejected`, and `withdrawn`. Interview types are `phone`, `video`, `onsite`,
`technical`, `behavioral`, and `other`.

## Screenshots

Screenshots are not included yet. Add **synthetic demo data only**; do not
capture real user records, email addresses, access tokens, or other sensitive
information. Save optimized PNG or WebP images under `screenshots/`, then
replace these placeholders:

| Screen | Screenshot |
|---|---|
| Dashboard | ![Dashboard screenshot placeholder](screenshots/dashboard.png) |
| Applications | ![Applications screenshot placeholder](screenshots/applications.png) |
| Interview schedule | ![Interview schedule screenshot placeholder](screenshots/interviews.png) |
| Analytics | ![Analytics screenshot placeholder](screenshots/analytics.png) |

### Taking screenshots

1. Run the app locally or open the public demo and sign in with a demo account.
2. Create representative, fictitious applications and interviews.
3. Resize the browser to a useful desktop or mobile viewport. Close menus and
   dialogs that obscure the page.
4. On Windows, press **Win+Shift+S**, select the relevant area, and save the
   capture as the matching file under `screenshots\`.
5. Review each image for personal data and secrets before committing it.

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 4 |
| Backend | Python 3.11+, FastAPI, Pydantic Settings, SQLAlchemy 2 |
| Database | PostgreSQL, Psycopg 3, Alembic |
| Authentication | Argon2 password hashing via `pwdlib`, signed JWT access tokens via PyJWT |
| Tests and lint | Pytest, FastAPI TestClient, Ruff, Node.js built-in test runner |
| Deployment | Vercel (frontend), Render (API), external PostgreSQL provider |

Python backend dependencies are declared in `backend/pyproject.toml`.
Frontend dependencies are in `frontend/package.json` and pinned by
`frontend/package-lock.json`. Install the frontend with `npm ci` for a
lockfile-based install.

## Architecture and data flow

```text
Browser (React/Vite)
  ├─ React Router: public pages and protected application workspace
  ├─ Shared API client: VITE_API_BASE_URL + JSON + Bearer access token
  └─ FastAPI
       ├─ Routers: HTTP endpoints, authentication, and authorization
       ├─ Pydantic schemas: input validation and response serialization
       ├─ Services: scoped queries and business operations
       ├─ SQLAlchemy session and ORM models
       └─ PostgreSQL

Alembic migrations ───────────────────────────────> PostgreSQL schema
```

The browser sends API requests to the configured API origin. FastAPI validates
the request, verifies the JWT for protected routes, and scopes database
operations to the authenticated user. SQLAlchemy persists application data in
PostgreSQL. Alembic manages schema changes independently; the API does not
create tables on startup.

## Database entities

| Entity | Purpose and relationships |
|---|---|
| `User` | Account profile, normalized unique email, password hash, and timestamps. One user owns many job applications. |
| `JobApplication` | Company, job title, URL, location, employment type, salary range, status, application date, notes, and timestamps. Each application belongs to one user and may have many interviews. |
| `Interview` | Scheduled timezone-aware date/time, interview type, meeting URL, notes, and timestamps. Each interview belongs to one application; ownership is derived through that application's user. |

Deleting a user cascades to their applications; deleting an application also
cascades to its interviews. Passwords are stored as hashes, not plaintext.
There is no duplicated `user_id` on an interview.

## Requirements

- Windows PowerShell
- Python 3.11 or newer
- Node.js 20.19+ or 22.12+ and npm (Vite 7 requirement)
- PostgreSQL locally or a reachable PostgreSQL provider for database-backed
  routes

The health endpoint and the test suite do not require a local PostgreSQL
server. Tests use isolated SQLite databases.

## Local setup

Open PowerShell at the repository root.

### Backend

```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

If PowerShell blocks activation, allow it for the current terminal only:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\.venv\Scripts\Activate.ps1
```

Edit `backend\.env` for your local setup. Set `DATABASE_URL` to a development
database that already exists. Example shape (replace the placeholders locally;
do not commit credentials):

```dotenv
DATABASE_URL=postgresql+psycopg://<user>:<url-encoded-password>@localhost:5432/jobtrack_dev
```

If using a local PostgreSQL installation, create a dedicated development
database and role using PostgreSQL tools or your database administration
interface. Do not point development or tests at a production database.

### Environment variables

Backend settings are read from environment variables and `backend\.env`.
`backend\.env.example` contains local defaults/placeholders only.

| Variable | Purpose | Local example / requirement |
|---|---|---|
| `APP_NAME` | API title | `JobTrack API` |
| `ENVIRONMENT` | Settings mode | `development`; production must be `production` |
| `FRONTEND_ORIGINS` | Allowed browser origins, as a JSON list | `["http://localhost:5173"]`; use exact HTTPS frontend origins in production |
| `DATABASE_URL` | SQLAlchemy database connection | PostgreSQL URL using the `psycopg` driver |
| `JWT_SECRET_KEY` | JWT signing secret | Generate a private, random value of at least 32 characters; production requires it explicitly |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime | Defaults to `15`; permitted range is 1–1440 |

Generate a signing secret locally in PowerShell; enter it only in your ignored
`backend\.env` or the deployment provider's secret settings:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Production `DATABASE_URL` must use PostgreSQL and include
`sslmode=verify-full`. Configure the database provider's trusted CA as required;
do not disable TLS certificate or hostname verification. Never put database
credentials or JWT secrets in the frontend or source control.

The frontend reads `VITE_API_BASE_URL` from `frontend\.env`. For local
development the example is `http://127.0.0.1:8000`. Production builds without
this variable use same-origin `/api` routes. `VITE_` variables are compiled
into browser assets and are public; use only non-secret configuration such as
the API origin.

## Database migrations

From `backend\`, with the virtual environment active and `DATABASE_URL`
configured in `backend\.env`:

```powershell
python -m alembic history
python -m alembic upgrade head
python -m alembic current
```

The migration command creates or updates the schema in the database selected
by `DATABASE_URL`. Review migrations before applying them to a persistent
database. Do not run destructive downgrade/reset commands against production.
To inspect generated upgrade SQL without applying it:

```powershell
python -m alembic upgrade head --sql
```

## Run the applications

Start the backend from `backend\`:

```powershell
python -m uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive documentation is
at `http://127.0.0.1:8000/docs`. Check
`http://127.0.0.1:8000/api/health` for `{"status":"ok"}`. This health endpoint
does not check database connectivity.

In a second PowerShell terminal, start the frontend:

```powershell
Set-Location frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Configure
the backend `FRONTEND_ORIGINS` to match that exact origin if it differs from
the default.

## API overview

Protected endpoints require `Authorization: Bearer <access-token>`.

| Method and path | Description |
|---|---|
| `GET /api/health` | API health response |
| `POST /api/auth/register` | Register and return the public account profile |
| `POST /api/auth/login` | Verify credentials and issue an expiring access token |
| `GET /api/auth/me` | Return the authenticated user's profile |
| `POST /api/applications` | Create an application |
| `GET /api/applications` | List/search/filter/sort/page the current user's applications |
| `GET /api/applications/{application_id}` | Get an owned application |
| `PATCH /api/applications/{application_id}` | Update an owned application |
| `DELETE /api/applications/{application_id}` | Delete an owned application and its interviews |
| `POST /api/applications/{application_id}/interviews` | Schedule an interview for an owned application |
| `GET /api/interviews` | List the current user's interviews; optional timezone-aware date bounds |
| `GET /api/interviews/{interview_id}` | Get an owned interview |
| `PATCH /api/interviews/{interview_id}` | Update an owned interview |
| `DELETE /api/interviews/{interview_id}` | Delete an owned interview |
| `GET /api/analytics/summary` | Return current-user application and interview metrics |

Application-list query parameters include `q`, `status`, `employment_type`,
`sort_by` (`applied_at` or `company`), `sort_order` (`asc` or `desc`), `page`,
and `page_size` (maximum 100). Interview datetimes use ISO 8601 and must include
a timezone offset; the API normalizes them to UTC. Analytics monthly buckets
use UTC calendar months for the current month and preceding five months.

See `/docs` while the backend is running for the full interactive API schema.

## Tests and lint

From `backend\` with development dependencies installed:

```powershell
python -m pytest
python -m ruff check app tests alembic
```

Backend tests use an isolated in-memory SQLite database, with disposable
temporary SQLite files for migration tests. They do not use `DATABASE_URL` or
connect to production.

From `frontend\`:

```powershell
npm test
```

The frontend tests use Node's built-in test runner and validate API request and
error-handling behavior.

For a standalone production frontend, optionally set its deployed HTTPS API
origin through the environment:

```powershell
$env:VITE_API_BASE_URL = 'https://api.example.com' # Replace with your API origin.
npm run build
Remove-Item Env:VITE_API_BASE_URL
```

When deploying this repository as a Vercel multi-service project,
`VITE_API_BASE_URL` can remain unset: the frontend calls `/api` on the same
domain, and the root `vercel.json` routes those requests to the backend.
If set, the variable must be an HTTPS origin without a path. Production assets
are written to `frontend\dist\`.

## Deployment

- The root `vercel.json` configures two services: `backend` (FastAPI, rooted
  at `backend`) and `frontend` (Vite, rooted at `frontend`). Deploy the
  repository root as the Vercel project so both services are discovered.
- The public rewrites route `/api/*` to the backend and all other paths to the
  frontend. The frontend calls the API through same-origin `/api` paths; no
  service binding is needed because the browser uses the public API route and
  the backend does not call another Vercel service.
- Configure the backend production variables `ENVIRONMENT`, `DATABASE_URL`,
  `JWT_SECRET_KEY`, and `FRONTEND_ORIGINS`. Since browser API calls are
  same-origin, include the deployed frontend origin in `FRONTEND_ORIGINS` only
  if it is needed by other clients. Run reviewed Alembic upgrades explicitly
  before relying on database-backed routes.
- The backend is reachable publicly only through the `/api/*` rewrite. The
  frontend service's `vercel.json` rewrites SPA routes to `index.html`.

Free hosting tiers may sleep, have usage quotas, or provide limited retention
and backup guarantees. Review provider terms before using them for persistent
or production-critical data. The live demo and repository links at the top
remain placeholders until deployment and publication are complete.

## Known limitations and possible next steps

- Authentication uses short-lived stateless JWTs stored in browser
  `sessionStorage`. Logout clears the local token but cannot revoke a copied
  token before expiry; JavaScript can read session storage, so XSS prevention
  is important. An HttpOnly cookie flow with CSRF protection would be a
  stronger future option.
- Account email verification, password reset, and account deletion are not
  implemented.
- No file upload or resume storage is implemented.
- Production database connectivity, backups, and hosting reliability depend
  on the configured provider and deployment plan.
- Possible future work: account recovery and verification, cookie-based
  authentication, PostgreSQL integration tests, and operational monitoring.

## Repository layout

```text
backend/
  alembic/                 Migration environment and revisions
  app/
    core/                  Settings, security, and logging
    db/                    SQLAlchemy engine and session
    models/                User, application, and interview ORM models
    routers/               FastAPI route handlers
    schemas/               Pydantic request/response models
    services/              Database operations and business logic
  tests/                   Pytest suite
frontend/
  src/
    api/                   Shared API client
    auth/                  Authentication state
    components/            Reusable interface components
    features/              Analytics and interview UI modules
    layouts/               Application shell
    pages/                 Route-level screens
    routes/                React Router configuration
  vercel.json              SPA route rewrite
```
>>>>>>> 35fcdc1 (Initial commit: JobTrack)
