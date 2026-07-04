# Development

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop

PowerShell may block `npm.ps1` on some Windows machines. Use `npm.cmd` if that happens.

## Start local services

```powershell
docker compose up -d
```

## Install dependencies

```powershell
npm.cmd install
```

## Configure environment

```powershell
Copy-Item .env.example .env
```

## Generate Prisma client and migrate database

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
```

## Run development servers

```powershell
npm.cmd run dev
```

Default URLs:

- Web: http://localhost:3000
- API: http://localhost:3001

