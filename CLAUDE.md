# GameChanger — Asset Marketplace Platform

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
| Payments | PayPal REST SDK (backend only) |
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
│       ├── payments/           # PayPal webhook + checkout
│       └── admin/              # Admin actions
├── components/
│   ├── ui/                     # Generic UI primitives
│   ├── three/                  # Three.js / R3F scene components
│   ├── assets/                 # Asset card, grid, viewer
│   └── layout/                 # Navbar, footer, sidebar
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── r2.ts                   # Cloudflare R2 S3 client + signed URL helpers
│   ├── paypal.ts               # PayPal SDK wrapper
│   └── auth.ts                 # NextAuth config
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
- amount, platformFee, creatorEarning
- paypalOrderId, paypalCaptureId
- status: `PENDING | COMPLETED | REFUNDED`
- createdAt

**Payout**
- id, creatorId → User
- amount, status: `PENDING | PROCESSING | PAID | FAILED`
- paypalPayoutBatchId
- createdAt

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
1. User clicks "Buy" → `POST /api/payments/create-order` → PayPal order created server-side
2. Frontend renders PayPal button with returned `orderId`
3. User approves on PayPal → frontend calls `POST /api/payments/capture-order`
4. Server captures payment, creates `Purchase` record, credits creator balance (minus platform fee)
5. Download signed URL generated on demand via `GET /api/assets/:id/download`

### Payout Flow
1. Creator requests payout from dashboard
2. `POST /api/payments/payout` → PayPal Payouts API called server-side
3. `Payout` record created; webhook updates status async

---

## Environment Variables

```env
# App
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=          # optional CDN endpoint for public previews

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox     # or "live"

# Platform
PLATFORM_COMMISSION_PERCENT=20   # e.g. 20 = platform keeps 20%
```

---

## Auth & Roles

- **NextAuth.js v5** with Prisma adapter
- Providers: `Credentials` (email + bcrypt password) and `GoogleProvider`
- Session strategy: JWT (edge-compatible) with `role` embedded in token
- Middleware (`middleware.ts`) protects `/dashboard/**` and `/admin/**`
- Admin role only assignable via direct DB update or seeded account

---

## Security Rules

- All R2 signed URLs expire in 15 minutes (downloads) / 5 minutes (uploads)
- PayPal order capture happens **server-side only** — client never touches API secrets
- Passwords hashed with `bcryptjs` (12 rounds)
- Admin routes additionally check `session.user.role === 'ADMIN'` server-side
- Never expose `fileKey` directly — always generate signed URLs on demand
- Rate-limit upload-url endpoint to prevent R2 abuse

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

- [ ] Set all environment variables in Vercel project settings
- [ ] Add `DATABASE_URL` pointing to production Postgres (e.g. Neon, Supabase, or Railway)
- [ ] Run `prisma migrate deploy` in build step or separately
- [ ] Configure Cloudflare R2 CORS to allow `https://yourdomain.com`
- [ ] Switch `PAYPAL_MODE=live` and update PayPal webhook URL
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Seed an admin user account
