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
- A MongoDB **replica set** (e.g. a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster). Booking creation relies on multi-document transactions, which standalone MongoDB doesn't support.

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

MongoDB has no equivalent of a Postgres `EXCLUDE` constraint, so overlapping bookings are prevented in application code: booking creation runs inside a MongoDB transaction that checks for overlapping, non-cancelled bookings for the same staff member (and customer) before inserting (`apps/api/src/lib/bookingEngine.ts`). This is why the replica-set connection above is required.

## Deploying

The API runs on Render and the web app on Vercel.

### API → Render

| Setting | Value |
|---|---|
| Root Directory | `apps/api` |
| Build Command | `pnpm install --frozen-lockfile && pnpm run build` |
| Start Command | `pnpm start` (runs `node dist/index.js`, the tsup build output; `node app.js` is equivalent) |
| Health Check Path | `/health` |

Environment variables (the API exits at startup with a clear message if a required one is missing):

| Key | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `MONGODB_URI` | yes | Atlas string with the database name, e.g. `…mongodb.net/servicebook?retryWrites=true&w=majority`. In Atlas → Network Access allow `0.0.0.0/0`. |
| `JWT_SECRET` | yes | 32+ characters: `openssl rand -base64 48` |
| `CORS_ORIGIN` | yes | `https://servicebook-drab.vercel.app` (comma-separate extra origins; `https://servicebook-*.vercel.app` allows previews) |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `EMAIL_PROVIDER` | no | `console` (default) or `resend` |
| `EMAIL_FROM`, `EMAIL_API_KEY` | only with `resend` | |

`PORT` is set by Render automatically. `render.yaml` describes the same setup as a Blueprint.

### Web → Vercel

Import the repo with **Root Directory** `apps/web` (framework: Vite) and set
`VITE_API_URL` to the Render URL without a trailing slash, e.g. `https://servicebook-api.onrender.com`.
The production build fails with a clear message if it's missing. `apps/web/vercel.json`
makes deep links such as `/dashboard` and `/book/your-business` work on refresh.
`VITE_API_URL` is baked in at build time, so redeploy after changing it.
