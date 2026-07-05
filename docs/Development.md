# Development

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop

PowerShell may block `npm.ps1` on some Windows machines. Use `npm.cmd` if that happens.

## Default local mode: SQLite

The default development setup uses Node's built-in SQLite support so the app can run without Docker.

## Configure environment

```powershell
Copy-Item .env.example .env
```

The API creates the local SQLite database automatically under `apps/api/data/`.

## Run development servers

```powershell
npm.cmd run dev
```

Default URLs:

- Web: http://localhost:3000
- API: http://localhost:3001

## Optional Docker/PostgreSQL mode

Use this only after Docker Desktop is working.

```powershell
docker compose up -d
```

Then replace `.env` with the PostgreSQL template:

```powershell
Copy-Item .env.postgres.example .env -Force
```

Generate and migrate with the PostgreSQL schema:

```powershell
npm.cmd run prisma:generate:postgres
npm.cmd run prisma:migrate:postgres
```
