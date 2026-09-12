# Deployment Guide

## Environments overview

| Env  | Consumer            | Admin                | API                     | DB                       |
|------|-----------------------|------------------------|---------------------------|----------------------------|
| Local| localhost:4200         | localhost:4300          | localhost:3000             | local MongoDB               |
| QA   | Netlify (QA site)      | Netlify (QA site)       | Render (QA service)        | MongoDB Atlas `cracker_shop_qa` |
| Prod | `www.<production-domain>` | `admin.<production-domain>` | `api.<production-domain>` | MongoDB Atlas `cracker_shop_prod` |

Never point a QA deployment at the production database, and never run destructive test operations against production data.

## 1. MongoDB Atlas

1. Create an Atlas project (or use the client's existing one).
2. Create two databases: `cracker_shop_qa` and `cracker_shop_prod` (a single cluster can host both — they're logically separated by database name).
3. Create a database user with a strong, generated password (not reused anywhere else).
4. Note the connection string for each database — these become `MONGODB_URI` for QA and prod respectively.
5. Configure automated backups per the selected Atlas plan.

## 2. Cloudinary

1. Create a Cloudinary account (or use the client's).
2. Note `Cloud Name`, `API Key`, `API Secret` from the dashboard.
3. Optionally create separate folders/presets for QA vs prod if you want visually separated media libraries — the app already namespaces uploads under `cracker-shop/products/`.

## 3. Backend (Render or equivalent)

1. Connect the GitHub repository, set the root directory to `backend/`.
2. Set the Node version to `20.x` (also declared in `backend/package.json`).
3. Build command: `npm ci --include=dev && npm run build`. Start command: `npm run start:prod`.
4. Configure environment variables (per environment — QA service and prod service each get their own):
   ```
   NODE_ENV=production
   PORT=3000
   API_PREFIX=api/v1
   MONGODB_URI=<Atlas connection string for this environment>
   JWT_SECRET=<long random string, unique per environment>
   JWT_EXPIRES_IN=15m
   CLOUDINARY_CLOUD_NAME=<...>
   CLOUDINARY_API_KEY=<...>
   CLOUDINARY_API_SECRET=<...>
   CORS_ORIGINS=<comma-separated consumer + admin frontend URLs for this environment>
   RATE_LIMIT_TTL=60
   RATE_LIMIT_MAX=20
   ```
5. Deploy. Verify `GET https://<api-host>/health` returns `{"status":"ok"}`.
6. Run the admin seed script once against this environment (from your local machine, pointed at the deployed `MONGODB_URI`, or via a one-off Render job):
   ```bash
   MONGODB_URI=<atlas-uri> ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin --prefix backend
   ```

## 4. Consumer frontend (Netlify)

1. Create a new Netlify site from the same GitHub repo.
2. Base directory: `consumer-portal`. Build command: `npm run build:qa` (QA site) or `npm run build:prod` (prod site). Publish directory: `dist/consumer-portal/browser`.
3. Before building, make sure `src/environments/environment.qa.ts` / `environment.prod.ts` point at the correct deployed API URL (these are static files, not runtime env vars — Angular builds are static).
4. Add a `_redirects` file (or Netlify's SPA redirect rule) so client-side routing works: `/* /index.html 200`.

## 5. Admin frontend (Netlify)

1. Create a **second** Netlify site from the same repo.
2. Base directory: `admin-portal`. Build command: `npm run build:qa` / `npm run build:prod`. Publish directory: `dist/admin-portal/browser`.
3. Same SPA redirect rule as above.
4. Confirm `environment.prod.ts` / `environment.qa.ts` point at the same API host as the consumer site's environment.

## 6. Production domain & DNS

1. Client registers and owns the final brand domain with GoDaddy or another registrar. Prefer a short, easy-to-spell name such as `shalinicrackers.in` if available. The registrar and hosting provider can be different.
2. Point DNS:
   - `www.<production-domain>` → Consumer Netlify site (Netlify custom domain + provided DNS records)
   - `admin.<production-domain>` → Admin Netlify site
   - `api.<production-domain>` → Backend host (Render custom domain / CNAME)
3. Select one public URL, preferably `https://www.<production-domain>`, and redirect the bare domain to it. Use that same URL for the consumer app's canonical tag, Open Graph URLs, JSON-LD, and sitemap.
4. Replace the placeholder API URL in `consumer-portal/src/environments/environment.prod.ts` and `admin-portal/src/environments/environment.prod.ts` with `https://api.<production-domain>/api/v1`.
5. Set backend `CORS_ORIGINS` to the production consumer and admin URLs, for example `https://www.<production-domain>,https://admin.<production-domain>`.
6. Enable HTTPS (Netlify and Render provision certificates after the custom domains are verified).
7. Submit `https://www.<production-domain>/sitemap.xml` in Google Search Console after DNS and deployment are live.

## 7. QA checklist

Run through `README.md`'s critical vertical flow end-to-end on the QA deployment, plus the full checklist in the spec (section 20): login, category CRUD, image upload, product CRUD, consumer display, mobile layout, contact links, maps, error states.

## 8. Production go-live

1. Repeat steps 3–6 with production environment variables and the production Atlas database.
2. Replace the temporary Netlify URL in `consumer-portal/src/index.html` and `consumer-portal/src/sitemap.xml` with the selected public production URL, then rebuild and redeploy the consumer portal.
3. Seed the production admin with a fresh, unique password (never reuse the QA admin password).
4. Verify the critical vertical flow once more against production.
5. Verify the custom domain, HTTPS redirect, `robots.txt`, sitemap, canonical URL, and Google Search Console property.
6. Hand over per `docs/handover.md`.
