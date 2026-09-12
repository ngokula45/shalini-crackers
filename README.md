# Cracker Shop Website

Production-ready fireworks/cracker shop monorepo: two Angular apps (Consumer + Admin) and a NestJS + MongoDB backend.

> **Note:** This is an informational product catalogue. There is **no online ordering, cart, checkout, or payment** for fireworks, per legal requirements.

## Structure

```text
cracker-shop/
├── consumer-portal/   # Public Angular site (no login) - localhost:4200
├── admin-portal/      # Admin Angular site (JWT login) - localhost:4300
├── backend/           # NestJS REST API - localhost:3000
├── scripts/           # seed-admin.ts and other ops scripts
└── docs/              # architecture, database, api, deployment, handover docs
```

## Quick Start (Local)

### 1. Prerequisites
- Node.js 18+
- npm
- MongoDB running locally (or Docker: `docker run -d -p 27017:27017 --name cracker-mongo mongo`)
- A free Cloudinary account (or leave placeholders to use local-disk fallback for image storage in dev — see `backend/src/uploads`)

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in values
npm install
npm run seed:admin        # creates the first admin user (reads ADMIN_EMAIL/ADMIN_PASSWORD from env)
npm run start:dev
```

API runs at `http://localhost:3000/api/v1`. Swagger docs at `http://localhost:3000/api/docs`. Health check at `http://localhost:3000/health`.

### 3. Consumer Portal

```bash
cd consumer-portal
npm install
npm start   # ng serve --port 4200
```

### 4. Admin Portal

```bash
cd admin-portal
npm install
npm start   # ng serve --port 4300
```

Login with the admin credentials you seeded in step 2.

## Environments

| Env  | Consumer               | Admin                     | API                        | DB                 |
|------|-------------------------|----------------------------|------------------------------|---------------------|
| Local| http://localhost:4200   | http://localhost:4300      | http://localhost:3000        | local MongoDB        |
| QA   | Netlify (QA site)       | Netlify (QA site)          | Render (QA service)          | MongoDB Atlas (QA db)|
| Prod | `www.<production-domain>` | `admin.<production-domain>` | `api.<production-domain>` | MongoDB Atlas (prod db)|

See `docs/deployment.md` for full deployment steps and `docs/architecture.md` for the system diagram.

## Critical Vertical Flow (verify this first)

```text
Admin Login → Create Category → Upload Product Image → Create Product
   → MongoDB stores metadata → Cloudinary stores image
   → Consumer API reads product → Consumer website displays product
```

This flow is covered by `backend/test/vertical.e2e-spec.ts`.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system architecture and data flow
- [`docs/database.md`](docs/database.md) — collections and schemas
- [`docs/api.md`](docs/api.md) — full REST API reference
- [`docs/deployment.md`](docs/deployment.md) — QA and production deployment steps
- [`docs/handover.md`](docs/handover.md) — client handover checklist

## What was intentionally left out

Per spec section 25: no microservices, no Kubernetes, no Redis, no payment gateway, no customer accounts/login, no cart/checkout, no online fireworks ordering. Keep it simple.

## Assumptions made (spec allowed choosing the simplest maintainable option where ambiguous)

- Local dev image storage falls back to disk (`backend/uploads/`) when Cloudinary env vars are placeholders, so the vertical flow works with zero external accounts. Set real Cloudinary credentials to use Cloudinary in any environment.
- Consumer and Admin are separate Angular workspaces (not an Nx monorepo) for simplicity, matching the spec's flat repo structure.
- JWT access token only (15 min expiry), no refresh-token rotation — acceptable for a low-traffic admin-only panel; documented in `docs/architecture.md` as a future improvement.
- Search/filter on the consumer portal implemented via simple query params (`?category=`, `?q=`) rather than a search engine.
