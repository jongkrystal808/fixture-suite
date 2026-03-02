# Fixture-M

Fixture-M is a fixture lifecycle management system (治具管理系統) for managing:
- fixture master data
- customer/station/machine model relationships
- inventory and material transactions (receipt/return)
- usage/replacement records
- serial/datecode tracking
- basic analytics and lifecycle views

The project is a full-stack app:
- `backend`: FastAPI API + static frontend assets
- `database`: MySQL schema/init scripts
- `docker-compose.yml`: local multi-container stack (MySQL + FastAPI + Nginx)

## Tech Stack

- Backend: FastAPI, Uvicorn, Pydantic
- Database: MySQL 8.0, PyMySQL, DBUtils connection pool
- Auth: JWT (Bearer token)
- Frontend: static HTML/CSS/JavaScript (served by Nginx or FastAPI static mount)
- Deployment/Dev: Docker, Docker Compose, Nginx

## Repository Structure

```text
Fixture-M/
├─ backend/
│  ├─ app/
│  │  ├─ routers/        # API modules (auth, fixtures, transactions, etc.)
│  │  ├─ models/         # Pydantic request/response models
│  │  ├─ utils/          # helpers (excel, password, validators, etc.)
│  │  ├─ auth.py         # JWT helpers
│  │  ├─ database.py     # DB pool + SQL execution helpers
│  │  └─ dependencies.py # auth/role/customer dependencies
│  ├─ web/               # frontend static files
│  ├─ config.py          # settings loader
│  ├─ main.py            # FastAPI entrypoint
│  └─ requirements.txt
├─ database/
│  ├─ init_database.sql
│  └─ my.cnf
├─ docker-compose.yml
├─ Dockerfile
└─ nginx.conf
```

## Main API Area

All main APIs are mounted under:
- `/api/v2`

Primary domains include:
- auth / users
- customers / owners / stations
- machine models / model details
- fixtures / fixture imports
- transactions / transaction imports / material transactions
- usage / replacement
- serials / inventory
- stats / lifecycle / lifecycle analysis

Swagger docs:
- `/docs`

ReDoc:
- `/redoc`

## Prerequisites

Choose one:
- Docker Desktop + Docker Compose
- Python 3.9 + MySQL 8.0 (local run)

## Configuration

Use `.env.example` as reference and create your own `.env`.

Important env vars:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `ENVIRONMENT`, `LOG_LEVEL`
- `UPLOAD_DIR`

For Docker Compose, the root `.env` is used by both database and app services.

## Run With Docker (Recommended)

From project root:

```powershell
docker compose up --build
```

Services:
- MySQL: `localhost:3307`
- FastAPI: `http://localhost:8000`
- Nginx: `http://localhost` (reverse proxy + static assets)

Useful URLs:
- App UI: `http://localhost/`
- API docs: `http://localhost/docs`
- Health check: `http://localhost/health` (Nginx), `http://localhost:8000/api/health` (FastAPI)

Stop:

```powershell
docker compose down
```

## Run Backend Locally (Without Docker)

1. Create/activate virtual environment
2. Install dependencies
3. Configure DB env vars
4. Run FastAPI

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Then open:
- `http://localhost:8000/docs`

## Database Initialization

When running via Docker Compose, schema is initialized from:
- `database/init_database.sql`

If running MySQL manually, import that SQL file yourself before starting the API.

## Authentication

- Login endpoint returns bearer token.
- Most protected endpoints require `Authorization: Bearer <token>`.
- Some flows also use `X-Customer-Id` header for customer-scoped operations.

## Notes

- The repo currently does not include a dedicated project test suite.
- Default/sample secrets in env examples should be replaced for any non-local environment.
- CORS is currently permissive in code (`*`), which should be tightened in production.

