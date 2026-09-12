# Architecture

## System diagram

```text
                         ┌─────────────────────┐
                         │   Consumer Angular   │  Netlify (www.<production-domain>)
                         │   (no login)         │
                         └──────────┬───────────┘
                                    │ HTTPS (public REST calls)
                                    ▼
┌───────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│   Admin Angular    │───▶│      NestJS API       │───▶│   MongoDB Atlas    │
│ (JWT login required)│  │ (api.<production-domain>) │    │ (product metadata, │
│ Netlify             │  │ Render                │    │  categories, admin, │
└────────────────────┘   └──────────┬────────────┘    │  site settings)     │
                                     │                  └────────────────────┘
                                     ▼
                          ┌──────────────────────┐
                          │      Cloudinary       │
                          │  (product images)     │
                          └──────────────────────┘
```

## Request flow: admin publishes a product

1. Admin logs in via `POST /auth/login` → NestJS verifies bcrypt hash, issues a short-lived JWT.
2. Admin Angular stores the JWT in `localStorage` and attaches it as a `Bearer` header on every subsequent request (`admin-portal/src/app/interceptors/auth.interceptor.ts`).
3. Admin uploads a product image → Angular sends `multipart/form-data` to `POST /admin/uploads/image` → NestJS validates file type/size → forwards to Cloudinary → Cloudinary returns `secure_url` + `public_id` → NestJS returns those to Angular (nothing is stored yet).
4. Admin creates the product → Angular sends the product fields plus the returned `imageUrl`/`imagePublicId` to `POST /admin/products` → NestJS validates, resolves the slug, stores the document in MongoDB.
5. Consumer Angular (a completely separate deployed app, no admin code shipped to it) calls the public `GET /products` / `GET /products/:slug` endpoints, which only ever return `isActive: true` products under `isActive: true` categories.
6. Because the API is the single source of truth, a normal admin update is visible on the consumer site on next page load — **no consumer frontend redeploy is required**.

## Backend module layout

```text
backend/src/
├── auth/            # login, JWT strategy, Admin schema
├── categories/       # public + admin category endpoints
├── products/         # public + admin product endpoints
├── uploads/           # Cloudinary / local-disk storage abstraction
├── site-settings/     # singleton business info document
├── common/            # guards, filters, decorators shared across modules
└── config/             # env loading + validation
```

Each domain module exposes **two controllers** where relevant: a `*PublicController` with no guard (mounted at e.g. `/products`) and a `*AdminController` protected by `JwtAuthGuard` (mounted at `/admin/products`). This keeps the "public API only exposes active/published data" rule enforced at the service layer rather than by convention.

## Security model

- **Backend is the final authority.** The Angular `authGuard` on the admin app only improves UX (hides routes, avoids flicker) — it does not protect any data. Every `/admin/*` endpoint independently re-validates the JWT server-side via `JwtAuthGuard`, per spec section 18 ("Never rely only on Angular's route guard for security").
- Passwords are hashed with bcrypt (cost factor 12) and the hash is `select: false` on the Mongoose schema so it's never returned by default.
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` is applied globally — any unexpected field in a request body is rejected rather than silently dropped or stored.
- `AllExceptionsFilter` ensures no stack trace, driver error, or internal message is ever sent to a client.
- Rate limiting (`@nestjs/throttler`) is applied globally and tightened further on `/auth/login` and `/admin/uploads/image`.
- Helmet sets standard security headers; CORS is restricted to the two configured frontend origins only.

## Image storage abstraction

`backend/src/uploads/storage.provider.ts` defines a `StorageProvider` interface with two implementations:

- `CloudinaryStorageProvider` — used whenever real `CLOUDINARY_*` env vars are set.
- `LocalDiskStorageProvider` — automatic fallback when Cloudinary vars are left as `replace_me`, so local development and the automated e2e test work without requiring a Cloudinary account. Files are written to `backend/uploads/` and served statically.

This was the one place the spec left an implementation detail open ("Do not store image binaries in MongoDB... Recommended: Cloudinary or another managed object/image storage service") — the local-disk fallback satisfies "or another... service" for local dev only; **QA and production must configure real Cloudinary credentials**.

## Known simplifications (documented per spec section 21: "if ambiguous, choose the simplest maintainable solution and document the assumption")

- **JWT access token only, no refresh token.** A 15-minute expiry means the admin re-logs-in periodically. Acceptable for a low-traffic single-admin (or few-admin) back office; a refresh-token flow can be added later without breaking the API shape.
- **Consumer and Admin are two separate Angular CLI workspaces**, not an Nx monorepo, matching the flat repo structure requested in the spec.
- **Search** on the consumer portal is a simple case-insensitive MongoDB regex on `name`/`description` — adequate for a catalogue of a few hundred products; would need a real search index (e.g. Atlas Search) at much larger scale.
