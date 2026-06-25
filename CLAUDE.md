# Dezignxo — Asset Marketplace Platform

A production-grade digital asset marketplace (similar to Freepik / Sketchfab) where users can browse, buy, and sell 2D/3D graphics and assets. Creators earn revenue from sales; the platform takes a commission. Admins moderate content and manage payouts.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| 3D Rendering | Three.js / React Three Fiber |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Prisma ORM |
| Storage | Cloudflare R2 (signed URLs) |
| Payments | Razorpay (orders + verify + webhook), RazorpayX (optional auto-payouts) |
| Auth | NextAuth.js v5 (Email + Google OAuth) |
| Hosting | Vercel |

---

## Project Structure

```
game_changer/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth group: login, register, error
│   ├── (marketing)/            # Public pages: home, browse, asset detail
│   ├── dashboard/              # Authenticated user area
│   │   ├── library/            # Purchased assets
│   │   ├── uploads/            # Creator uploads + earnings
│   │   └── profile/            # Profile settings
│   ├── admin/                  # Admin panel (role-gated)
│   │   ├── assets/             # Approve/reject uploads
│   │   ├── users/              # User management
│   │   └── payments/           # Payment/payout management
│   └── api/                    # API routes
│       ├── auth/               # NextAuth handlers
│       ├── assets/             # Asset CRUD + upload URLs
│       ├── payments/           # Razorpay create-order + verify-payment + webhook
│       └── admin/              # Admin actions
├── components/
│   ├── ui/                     # Generic UI primitives
│   ├── three/                  # Three.js / R3F scene components
│   ├── assets/                 # Asset card, grid, viewer
│   └── layout/                 # Navbar, footer, sidebar
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── r2.ts                   # Cloudflare R2 S3 client + signed URL helpers
│   ├── razorpay.ts             # Razorpay SDK + HMAC signature verification
│   ├── razorpay-payouts.ts     # RazorpayX wrapper (optional auto-payout mode)
│   ├── email.ts                # Resend transactional email
│   └── auth.ts                 # NextAuth v5 config
├── prisma/
│   ├── schema.prisma           # DB schema
│   └── migrations/
├── public/
└── middleware.ts               # Auth + role guards
```

---

## Database Schema (Prisma)

### Core models

**User**
- id, name, email, emailVerified, image, passwordHash
- role: `USER | CREATOR | ADMIN`
- balance (pending payout amount)
- createdAt, updatedAt
- Relations: assets (uploaded), purchases (as buyer), accounts (OAuth)

**Asset**
- id, title, description, category, tags[]
- fileKey (R2 object key for the actual file)
- previewKey (R2 object key for preview image/thumbnail)
- price (in USD cents; 0 = free)
- status: `PENDING | APPROVED | REJECTED`
- downloads, likes
- uploaderId → User
- createdAt, updatedAt

**Purchase**
- id, buyerId → User, assetId → Asset
- amount, platformFee, creatorEarning (all in INR paise)
- licenseKey (unique, auto-generated — buyer's proof of purchase)
- razorpayOrderId, razorpayPaymentId
- status: `PENDING | COMPLETED | REFUNDED`
- createdAt

**Payout**
- id, creatorId → User
- amount (in INR paise), status: `PENDING | PROCESSING | PAID | FAILED`
- razorpayPayoutId (set when admin uses RazorpayX)
- transactionRef (UTR / IMPS ref recorded by admin when settling manually)
- failureReason
- createdAt, updatedAt

**AdminLog**
- id, adminId → User, action, targetId, targetType, note
- createdAt

---

## Key Flows

### Upload Flow
1. Creator submits asset metadata via form
2. Frontend calls `POST /api/assets/upload-url` → returns signed PUT URL for R2
3. Frontend uploads file directly to R2 (no server relay)
4. Frontend calls `POST /api/assets` to create DB record with status `PENDING`
5. Admin reviews and calls `PATCH /api/admin/assets/:id` → sets status `APPROVED`
6. Asset becomes publicly visible

### Purchase Flow
1. User clicks "Buy" → `POST /api/payments/create-order` → Razorpay order created server-side; no Purchase row yet
2. Frontend opens Razorpay checkout modal with the returned `orderId`
3. User pays → frontend posts the `razorpay_*` fields to `POST /api/payments/verify-payment`
4. Server verifies HMAC-SHA256 signature AND re-fetches the order from Razorpay to confirm `status === "paid"`, amount, asset, and buyer all match
5. On success: creates `Purchase` (status `COMPLETED`), credits creator balance (minus platform fee), notifies both parties
6. Backstop: `POST /api/payments/webhook` (event `payment.captured`) creates the same Purchase if the browser callback was lost
7. Download via `GET /api/assets/:id/download` — server checks the Purchase row before reading the private R2 file

### Payout Flow
1. Creator with KYC verified requests payout from `/dashboard/earnings`
2. `POST /api/payouts/request` → balance moved to a new `Payout` row (status `PENDING`)
3. **Manual mode** (no RazorpayX): admin sends the money via bank transfer, marks PAID with the UTR
4. **RazorpayX mode**: admin clicks "Send via RazorpayX" → `/api/admin/payouts/:id/send-razorpayx` → status driven by webhook events `payout.processed | failed | reversed`

---

## Environment Variables

```env
# App
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database (Neon pooled + direct)
DATABASE_URL=           # pooled, runtime queries
DIRECT_URL=             # unpooled, Prisma migrations only

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=          # public-bucket base URL for previews/models

# Razorpay (rzp_test_* in sandbox, rzp_live_* in production)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# RazorpayX (optional — leave blank for manual payout mode)
RAZORPAY_X_KEY_ID=
RAZORPAY_X_KEY_SECRET=
RAZORPAY_X_ACCOUNT_NUMBER=

# Resend (transactional email)
RESEND_API_KEY=
EMAIL_FROM="Dezignxo <noreply@yourdomain.com>"  # must be a verified Resend sender

# Platform
PLATFORM_COMMISSION_PERCENT=20   # e.g. 20 = platform keeps 20%

# Admin bootstrap — this email auto-promotes to ADMIN on sign-in
ADMIN_EMAIL=
```

---

## Auth & Roles

- **NextAuth.js v5** with Prisma adapter
- Providers: `Credentials` (email + bcrypt password) and `Google` OAuth
- Session strategy: JWT (edge-compatible) with `role` embedded in token
- Route protection: `/dashboard/**` enforced by [app/dashboard/layout.tsx](app/dashboard/layout.tsx); `/admin/**` enforced by [app/admin/layout.tsx](app/admin/layout.tsx) via `requireAdmin()`
- Every admin API route additionally calls `getAdminSession()` / `requireAdmin()`
- Bootstrap admin: any user whose email matches `ADMIN_EMAIL` is auto-promoted to ADMIN on every sign-in (see `lib/auth.ts → maybePromoteAdmin`)

---

## Security Rules

- Razorpay order capture happens **server-side only** — client never touches API secrets
- Razorpay signature verified via HMAC-SHA256 with `crypto.timingSafeEqual` (no timing leak); verify-payment additionally cross-checks the order with Razorpay's authoritative API to close the asset-swap attack
- Razorpay webhook signature verified against the **raw request body** (never `.json()` first) using `RAZORPAY_WEBHOOK_SECRET`
- Passwords hashed with `bcryptjs` (12 rounds)
- Never expose `fileKey` directly — the private R2 file is only read by `/api/assets/[id]/download` after a Purchase / ownership / admin check
- Rate limiting on upload, create-order, verify-payment, register, password-reset endpoints (see `lib/rate-limit.ts`)
- Mock dev checkout at `/api/payments/checkout` is hard-blocked when `NODE_ENV === "production"`

---

## Commission Logic

```
creatorEarning = price * (1 - PLATFORM_COMMISSION_PERCENT / 100)
platformFee    = price - creatorEarning
```

Free assets (price = 0) are tracked as purchases but no payment is processed.

---

## Commands

```bash
# Dev
npm run dev

# Prisma
npx prisma generate
npx prisma migrate dev --name <name>
npx prisma studio

# Build
npm run build
npm start
```

---

## Deployment Checklist (Vercel)

- [ ] Set all environment variables in Vercel project settings (mirror everything in `.env`)
- [ ] Add `DATABASE_URL` + `DIRECT_URL` pointing to production Neon Postgres
- [ ] `prisma migrate deploy` is wired into the build step (`prisma.config.ts` + `package.json` build script)
- [ ] Configure Cloudflare R2 CORS to allow `https://yourdomain.com` with methods `GET, HEAD`
- [ ] Swap Razorpay keys from `rzp_test_*` → `rzp_live_*` after KYC clears
- [ ] Configure Razorpay webhook in dashboard → `https://yourdomain.com/api/payments/webhook` → subscribe to `payment.captured`, `payment.failed`, `refund.processed`, `payout.processed`, `payout.failed`, `payout.reversed` → copy signing secret to `RAZORPAY_WEBHOOK_SECRET`
- [ ] Verify production sender domain in Resend → set `EMAIL_FROM=Dezignxo <noreply@yourdomain.com>`
- [ ] Add `https://yourdomain.com/api/auth/callback/google` as an Authorized Redirect URI in Google Cloud Console
- [ ] Set `NEXTAUTH_URL=https://yourdomain.com`
- [ ] Generate a fresh `NEXTAUTH_SECRET` for production (`openssl rand -base64 32`)
- [ ] Set `ADMIN_EMAIL` to the client's real email so they auto-promote on first sign-in
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Seed an admin user account
