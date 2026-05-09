# GameChanger — Deployment Guide

End-to-end guide to take this app from `localhost:3000` to a live, production-ready deployment.

---

## Stack at a glance

| Concern | Service | Free tier? |
|---|---|---|
| Hosting | Vercel | Yes |
| Database | Neon (Postgres) | Yes |
| File storage | Cloudflare R2 | Yes (10 GB / 10M reads) |
| Auth | NextAuth.js v5 | — |
| Payments | PayPal REST | Yes (sandbox) |
| Email (optional) | Resend | Yes (3k/mo) |

---

## 0. Prerequisites

Create accounts (all free):

1. [GitHub](https://github.com) — code hosting
2. [Vercel](https://vercel.com) — sign in with GitHub
3. [Neon](https://neon.tech) — Postgres database
4. [Cloudflare](https://dash.cloudflare.com) — R2 storage
5. [Google Cloud Console](https://console.cloud.google.com) — OAuth
6. [PayPal Developer](https://developer.paypal.com) — payments (sandbox + live)

---

## 1. Local development setup

You need Postgres running locally OR you can point straight at a Neon dev branch.

### Option A: Neon dev branch (easiest)

1. Create a project on Neon → copy the connection string (looks like `postgresql://user:pass@host/db?sslmode=require`)
2. Use this same string as your local `DATABASE_URL` for now

### Option B: Local Postgres

```powershell
# Install postgres if you don't have it (Windows)
winget install PostgreSQL.PostgreSQL.16

# Create the dev DB
createdb gamechanger_dev
# Connection string:
# postgresql://postgres:postgres@localhost:5432/gamechanger_dev
```

### Initialize

```powershell
# 1. Copy env template
Copy-Item .env.example .env.local

# 2. Fill in DATABASE_URL + NEXTAUTH_SECRET (see below) at minimum

# 3. Generate Prisma client + push schema to your DB
npx prisma generate
npx prisma migrate dev --name init

# 4. Run dev server
npm run dev
```

Generate a `NEXTAUTH_SECRET`:

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 } | ForEach-Object { [byte]$_ }))
```

You can now register an account at `http://localhost:3000/register` — it goes straight to the database.

### Promote yourself to ADMIN

Initial admin must be set via direct DB write. Open Prisma Studio:

```powershell
npx prisma studio
```

Find your User row → change `role` to `ADMIN` → Save. Refresh the app — `/admin` is now accessible.

---

## 2. Production database (Neon)

1. Sign in to Neon → **Create project** → pick a region close to your Vercel region (typically `aws-us-east-1` or `aws-eu-central-1`)
2. Inside the project, go to **Connection Details** → copy the **pooled** connection string (it has `-pooler` in the host). This goes in `DATABASE_URL`
3. Also copy the **direct** (non-pooled) string → save as `DIRECT_URL` for migrations

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Run an initial migration against production:

```powershell
$env:DATABASE_URL = "your-direct-connection-string"
npx prisma migrate deploy
```

---

## 3. Cloudflare R2 (file storage)

1. Cloudflare dashboard → **R2** → **Create bucket** → name it `gamechanger-prod`
2. Settings → **CORS policy** → add:

   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. **R2 → Manage API Tokens → Create API Token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `gamechanger-prod`
   - Copy `Access Key ID` and `Secret Access Key`

4. Note your **Account ID** (top-right of Cloudflare dashboard)

5. (Optional) Set up a public CDN endpoint for previews:
   - Bucket → **Settings → Public access → Custom domain** → connect `assets.yourdomain.com`
   - Use this as `R2_PUBLIC_URL`

---

## 4. Google OAuth

1. [console.cloud.google.com](https://console.cloud.google.com) → Create project
2. **APIs & Services → OAuth consent screen** → External → fill in app name, support email
3. **Credentials → Create credentials → OAuth client ID → Web application**
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)
5. Copy **Client ID** and **Client Secret**

---

## 5. PayPal

### Sandbox (testing)

1. [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → **Sandbox**
2. Create app → **Merchant** type
3. Copy **Client ID** and **Secret**
4. Sandbox test buyer accounts are auto-generated under **Sandbox → Accounts**

### Live (production)

Same steps under the **Live** tab. **Do not switch to live until you've end-to-end tested with sandbox.**

PayPal webhook (when you wire it up):

- URL: `https://yourdomain.com/api/payments/webhook`
- Subscribe to: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, `PAYMENT.PAYOUTS-ITEM.FAILED`

---

## 6. Push to GitHub

```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/gamechanger.git
git push -u origin main
```

**Don't commit `.env.local`** — it should already be in `.gitignore`.

---

## 7. Deploy to Vercel

1. [vercel.com/new](https://vercel.com/new) → Import the GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Build command: leave default (`next build`)
4. Add environment variables (paste each one — see table below)
5. Deploy

### Environment variables checklist

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string | Has `-pooler` in host |
| `DIRECT_URL` | Neon **direct** connection string | For migrations |
| `NEXTAUTH_URL` | `https://yourdomain.com` | No trailing slash |
| `NEXTAUTH_SECRET` | 32-byte base64 string | Generate fresh per environment |
| `GOOGLE_CLIENT_ID` | From Google Console | |
| `GOOGLE_CLIENT_SECRET` | From Google Console | |
| `R2_ACCOUNT_ID` | Cloudflare account ID | |
| `R2_ACCESS_KEY_ID` | From R2 API token | |
| `R2_SECRET_ACCESS_KEY` | From R2 API token | |
| `R2_BUCKET_NAME` | `gamechanger-prod` | |
| `R2_PUBLIC_URL` | `https://assets.yourdomain.com` | Optional CDN |
| `PAYPAL_CLIENT_ID` | From PayPal app | |
| `PAYPAL_CLIENT_SECRET` | From PayPal app | |
| `PAYPAL_MODE` | `sandbox` or `live` | Start with `sandbox` |
| `PLATFORM_COMMISSION_PERCENT` | `20` | Whole number |

### Run migrations on Vercel

Add this to `package.json` so migrations run on every deploy:

```json
"scripts": {
  "build": "prisma generate && prisma migrate deploy && next build"
}
```

> **Why both?** `prisma generate` regenerates the client (Vercel ships fresh node_modules each build). `migrate deploy` applies any new migrations against the production DB.

### Custom domain

Vercel project → **Settings → Domains** → add `yourdomain.com`. Vercel gives you DNS records — add them at your registrar.

After it's live:

- Update `NEXTAUTH_URL` to the production domain
- Add the production callback URL to Google OAuth credentials
- Update R2 CORS to include the production origin

---

## 8. Post-deploy checklist

- [ ] Visit `https://yourdomain.com` — homepage renders
- [ ] `/register` creates a new account (check Neon console for the row)
- [ ] `/login` works for the new account
- [ ] Google sign-in works
- [ ] Promote one account to ADMIN via Neon → SQL editor:

  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
  ```

- [ ] `/admin` is accessible to that account, denied to others
- [ ] `/dashboard/profile` lets you edit name/bio/website
- [ ] Password change works
- [ ] PayPal sandbox checkout completes (once Phase 7 is wired)

---

## 9. Going live with PayPal

When sandbox tests pass end-to-end:

1. Vercel → **Settings → Environment Variables** → change `PAYPAL_MODE` to `live`
2. Replace `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` with **live** credentials
3. Re-deploy (or restart the deployment so env-var changes take effect)
4. Update PayPal webhook URL in the Live dashboard to point at `https://yourdomain.com/api/payments/webhook`
5. Run a real, small purchase to verify end-to-end

---

## 10. Operational notes

### Logs

- Application logs: Vercel project → **Deployments → \<deployment\> → Logs**
- Database query logs: Neon → **Monitoring**
- R2 metrics: Cloudflare → R2 → bucket → Metrics

### Scaling

- **Database**: Neon auto-scales storage; for compute, upgrade from free tier when you hit consistent CPU > 30%
- **R2**: free tier covers most early-stage workloads; usage-based pricing kicks in after 10 GB / 10M class-A operations
- **Vercel**: free tier (Hobby) is fine until you exceed 100 GB-hours of serverless or 100 GB bandwidth — upgrade to Pro when that happens

### Backups

Neon takes continuous WAL backups (point-in-time restore). For extra safety, export weekly:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
```

### Security

- Rotate `NEXTAUTH_SECRET` only when you're OK forcing all users to re-login
- Rotate R2 + PayPal keys every 90 days
- Never expose `fileKey` to the client — always generate signed URLs server-side
- Admin role can only be granted via DB or by an existing admin via `/admin/users`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Invalid `prisma.user.findUnique()` invocation" on Vercel | Migrations didn't run | Add `prisma migrate deploy` to build script |
| Google sign-in says "redirect_uri_mismatch" | Production callback not added | Add `https://yourdomain.com/api/auth/callback/google` to Google OAuth credentials |
| Uploads fail with CORS error | R2 CORS doesn't include prod origin | Update R2 CORS policy |
| 500 on every page after deploy | Missing env var | Check Vercel logs → look for `undefined` env reference |
| Auth works locally, fails in prod | `NEXTAUTH_URL` mismatch | Must exactly match your domain (no trailing slash, correct protocol) |

---

## Phase status

| Phase | Status |
|---|---|
| 1. Marketing pages, design system | ✅ Shipped |
| 2. Performance pass (lazy WebGL) | ✅ Shipped |
| 3. Auth + dashboard + profile | ✅ Shipped |
| 4. Database (real Postgres) | Ready — needs `DATABASE_URL` |
| 5. Creator uploads (R2) | Future |
| 6. Admin panel | ✅ Shipped |
| 7. Payments (PayPal checkout) | Future |
| 8. Payouts | Future |
| 9. Deployment guide | ✅ This document |
