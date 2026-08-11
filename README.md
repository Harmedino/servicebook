# ServiceBook

A multi-tenant booking platform for appointment-based service businesses (barbers, salons, nail techs, makeup artists, massage therapists, personal trainers, photographers, cleaners, etc).

## Stack

- **Frontend** — React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- **Backend** — Node.js, Express, TypeScript, MongoDB, Mongoose, REST, JWT
- **Monorepo** — pnpm workspaces

```text
servicebook/
├── apps/
│   ├── web/        # React frontend
│   └── api/        # Node/Express backend
├── packages/
│   ├── types/      # Shared TypeScript types (buildless, consumed as source)
│   └── config/     # Shared tsconfig
```

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- A MongoDB **replica set** connection string (e.g. a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster) — booking creation relies on multi-document transactions, which standalone MongoDB doesn't support.

## Setup

```bash
pnpm install

cp apps/api/.env.example apps/api/.env      # fill in MONGODB_URI and JWT_SECRET
cp apps/web/.env.example apps/web/.env

pnpm dev           # runs api (:4000) and web (:5173) together
```

Mongoose schemas live in `apps/api/src/models/` — there's no separate generate/push step; models are applied the moment the API connects, and indexes are created (or synced) by Mongoose on first use of each model.

## Multi-tenancy

Every business-owned record (`Service`, `Staff`, `Customer`, `Booking`, `BusinessHours`) carries a `businessId`. Authenticated routes derive `businessId` server-side from the JWT-authenticated user via the `requireBusiness` middleware — it is never accepted from the client. See `apps/api/src/middleware/auth.ts`.

## Double-booking prevention

MongoDB has no equivalent of a Postgres `EXCLUDE` constraint, so overlapping-booking prevention will be enforced in application code: booking creation will run inside a MongoDB transaction that checks for overlapping, non-cancelled bookings for the same staff member before inserting. This requires the replica-set connection noted above. **Not implemented yet** — the `Booking` model exists, but the availability/conflict-checking logic is future work.
