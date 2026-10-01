# ServiceBook

Online booking, a shared calendar and a client list for businesses that run on appointments: barbers, salons, nail techs, makeup artists, spas, massage therapists, trainers and clinics. Built first for small businesses in Nigeria that currently run on WhatsApp, paper diaries and spreadsheets. It works in any currency and time zone.

- **Live app:** https://servicebook-drab.vercel.app
- **Try it:** https://servicebook-drab.vercel.app/demo. Book at a demo salon as a customer, then open it as the owner or as a staff member.
- **What's next:** https://servicebook-drab.vercel.app/roadmap
- **In plain words:** https://servicebook-drab.vercel.app/about

---

## Contents

1. [What it does](#what-it-does)
2. [How it fits together](#how-it-fits-together)
3. [Every page in the app](#every-page-in-the-app)
4. [Architecture](#architecture)
5. [Running it locally](#running-it-locally)
6. [Deploying](#deploying)

---

## What it does

There are three kinds of people in ServiceBook. Each one sees something different.

### Customers (no account, no app to install)

| They can | Where |
|---|---|
| Open the business's booking link from Instagram, WhatsApp or a printed QR poster | `/book/:slug` |
| Browse tabs: **Book**, **Team**, **Our work** (photos of finished styles), **Reviews**, **Info** (hours, directions, contact) | `/book/:slug?tab=…` |
| Book: pick a service, optionally a person, a day and a free time, then enter name and phone | `/book/:slug` |
| Join a **waitlist** when a day is fully booked | booking page |
| Chat with the business about a booking, cancel it, add it to their calendar, and rate the visit afterwards | `/my-booking/:token` |
| See **all their appointments** (past and upcoming) and **book again** without retyping their details | `/c/:token` |
| Join the business's client list (name, number, optional birthday) | `/join/:slug` |
| Ask to chat on WhatsApp, Instagram, Messenger, TikTok, X, Telegram or Snapchat. Their details are saved first, so every chat reaches the Inbox | booking page → "Chat with us" |

Payment happens at the appointment. Nothing is paid online yet.

### Owners

| Area | What's there |
|---|---|
| **Home** (`/dashboard`) | Today's schedule, what's next, setup checklist, this week's birthdays with a ready-to-send WhatsApp wish |
| **Inbox** | Booking chats with customers, and chat requests from social apps |
| **Bookings** (`/bookings`) | List with search and filters. Each booking opens on its own page with confirm, mark done, no-show, move, cancel, notes and chat |
| **New booking** (`/bookings/new`) | Search or quick-add a customer, then service, person, day and time |
| **Calendar** | Day, week and month views, time off shaded. **Front desk view** (`/front-desk`) is a full-screen version for a tablet at reception |
| **Calendar sync** (`/calendar/sync`) | Subscribe from Google, Apple or Outlook, for the whole business or one person |
| **Customers** | Client list with history; each profile has a private link to send them (their own page) |
| **Services, Staff** | Prices, durations and who does what. Staff have hours, a bio, a location, ratings and an **App access** card to invite them |
| **Showcase** | Photos of finished work tagged by person and service, and the reviews customers leave |
| **Time off** | Block days or hours for one person or the whole business. Nobody can book those times, and clashes are listed |
| **Waitlist** | People waiting for a full day. You're notified when a spot opens |
| **Settings** | Business details, opening hours, chat apps, booking page on/off, **your colour**, emails, and a **printable QR poster** (`/poster`) |
| **Notifications** | A bell plus push alerts to the owner's phone or computer, even with the site closed |
| **Roadmap & ideas** | Vote on what gets built next and suggest ideas |

### Staff (their own login, by invite)

The owner invites someone from their staff page. The staff member opens a one-time link (`/join-team/:token`) and picks an email and password. After that they see **only**:
- their own bookings
- their calendar
- their booking chats
- their own time off

They can book customers in with themselves. Everything else is owner-only, and the server enforces it (see [Security](#security)).

---

## How it fits together

A typical week, end to end:

1. **Set up.** The owner signs up, creates the business (hours, time zone, currency), and adds services and staff.
2. **Share.** They copy the booking link into their Instagram bio and WhatsApp status, and print the QR poster for the counter.
3. **A customer books.** They see only times that are really free. Free times come from opening hours, the person's weekly hours, their time off and existing bookings, and are checked again at the moment of booking. The customer gets their own booking page with a chat that has already said hello.
4. **The owner hears about it.** They get a bell notification and a push to their phone. The booking appears on the calendar, in any synced Google, Apple or Outlook calendar, and on the front desk screen.
5. **Before the visit.** The customer can message, cancel or add it to their calendar, and gets an email reminder a day before if they gave an email. If they cancel and people are on the waitlist for that day, the owner is told a spot opened.
6. **After the visit.** Staff mark it done. The customer is asked to rate it, and the rating appears on the booking page under that person's profile.
7. **Next time.** The customer opens their own page, taps **Book again**, and only has to pick a time.

Customers are added to the client list automatically when they book. They're matched by phone number within each business.

---

## Every page in the app

| Path | Who | What |
|---|---|---|
| `/`, `/features`, `/solutions`, `/how-it-works`, `/about`, `/demo`, `/roadmap`, `/design` | Everyone | Website, live demo, roadmap and design system |
| `/register`, `/login` | Owners and staff | Sign up and sign in |
| `/book/:slug` | Customers | Booking page with tabs |
| `/my-booking/:token` | Customers | One booking: details, chat, cancel, rate |
| `/c/:token` | Customers | All their appointments; book again |
| `/join/:slug` | Customers | Join the client list |
| `/join-team/:token` | Staff | Create a staff login from an invite |
| `/dashboard` | Owner | Home |
| `/inbox` | Owner, staff (own chats) | Messages and chat requests |
| `/bookings`, `/bookings/new`, `/bookings/:id` | Owner, staff (own) | Bookings |
| `/calendar`, `/front-desk`, `/calendar/sync` | Owner (staff: `/calendar` only) | Calendar views and sync |
| `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit` | Owner (staff can view a customer) | Clients |
| `/services`, `/services/new`, `/services/:id`, `/services/:id/edit` | Owner | Services |
| `/staff`, `/staff/new`, `/staff/:id`, `/staff/:id/edit` | Owner | Team, hours, time off, app access |
| `/showcase`, `/showcase/new`, `/showcase/:id/edit` | Owner | Portfolio and reviews |
| `/time-off`, `/time-off/new` | Owner, staff (own) | Time off |
| `/waitlist` | Owner | Waitlist |
| `/settings`, `/poster` | Owner | Settings and the printable poster |

---

## Architecture

### Stack

- **Web.** React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS v4, Motion. There's also a service worker (`public/sw.js`) for push alerts.
- **API.** Node.js, Express, TypeScript, MongoDB with Mongoose, zod validation, JWT auth, web-push.
- **Monorepo.** pnpm workspaces. `packages/types` holds the request and response types shared by both apps, so the web and API can't drift apart.

```text
servicebook/
├── apps/
│   ├── web/                 React app (Vercel)
│   │   ├── public/sw.js     Service worker: push alerts when the site is closed
│   │   └── src/
│   │       ├── pages/       One file per page (marketing/ for the website)
│   │       ├── components/  Shared UI (ui/ for primitives)
│   │       └── lib/         Data hooks (one per API area) and helpers
│   └── api/                 Express API (Render)
│       └── src/
│           ├── routes/      One router per area
│           ├── models/      Mongoose models
│           ├── lib/         Booking engine, push, ratings, iCalendar, demo…
│           ├── services/    Email, reminders, birthday notices
│           └── middleware/  Auth, business scoping, staff access list
└── packages/
    ├── types/               Shared TypeScript types
    └── config/              Shared tsconfig
```

### Data

| Model | Holds |
|---|---|
| `User` | Login: `OWNER` or `STAFF` |
| `Business` | Profile, slug, time zone, currency, colour, settings, calendar-feed token |
| `BusinessHours`, `StaffAvailability` | Weekly opening hours and each person's working hours |
| `Service`, `Staff` | What's offered and who does it. Staff have optional `userId` (login) and invite token |
| `Customer` | Per business, unique by phone. Optional birthday and a private page token |
| `Booking` | Who, what, when, status, price at the time, private access token |
| `Message` | Booking chat (customer ↔ business) |
| `TimeOff` | Unavailable time for a person or the whole business |
| `WaitlistEntry` | Someone waiting for a full day |
| `Review`, `WorkPost` | Ratings after completed visits; portfolio photos |
| `Enquiry` | Chat requests from social apps |
| `Notification`, `PushSubscription` | The owner's bell and the devices that get push alerts |
| `Image` | Uploaded photos (stored in MongoDB) |
| `Idea`, `AppSetting` | Roadmap items and votes; server-wide values such as the push keys |

### Booking rules

`apps/api/src/lib/bookingEngine.ts` is the single path for creating and moving bookings, for both owners and customers.
- **Free times:** worked out in the business's time zone from opening hours, the person's weekly hours, time off and existing bookings. They're offered on 30-minute starts.
- **No double booking:** MongoDB has no exclusion constraint, so the overlap check and the insert run in one **transaction**. That's why the database must be a replica set (any Atlas cluster is one).
- **"Any available":** spreads bookings across staff, trying the owner first, then whoever has the lightest day.

### Security

- **Tenancy.** Every business record carries `businessId`. `requireBusiness` derives it on the server from the signed-in user and never trusts one sent by the client.
- **Staff access is blocked by default.** A `STAFF` login may only call the endpoints listed in `middleware/staffAccess.ts`. Those endpoints then limit data to that person: their bookings, chats and time off. Anything not on the list is owner-only.
- **Customer links.** `/my-booking/:token` and `/c/:token` use long random tokens. They're private links, the same model as Google's "secret address" calendar links.
- **Push alerts.** Only HTTPS endpoints on the real browser push services are accepted, so the server can't be pointed at arbitrary URLs. Keys are generated once and stored if they're not set in the environment.
- **Rate limits** apply to login, public booking, chat and roadmap endpoints. Passwords are hashed with bcrypt.

### Background jobs

These run inside the API process:
- **Email reminders:** a day before each booking, every 15 minutes.
- **Birthday notices:** once a day per business, from 8 AM local time.
- **Demo reset:** the demo salon is rebuilt daily.

---

## Running it locally

**You need:** Node.js 20+, pnpm (`corepack enable`), and a MongoDB **replica set**. A free Atlas cluster works. Locally, a single-node replica set works too:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec mongo mongosh --eval 'rs.initiate()'
```

**Then:**

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # works as-is against local Mongo
cp apps/web/.env.example apps/web/.env

pnpm dev                    # API on :4000, web on :5173

pnpm --filter api seed      # demo salon with staff, services, clients, bookings and reviews
```

**Demo logins** (password `password123` for both):
- Owner: `demo@servicebook.app`
- Staff (Tunde): `tunde@demo.servicebook.app`

**Type checks:** run `pnpm typecheck` from the repo root, or `pnpm --filter api typecheck` / `pnpm --filter web typecheck` for one app.

---

## Deploying

The API runs on **Render**, the web app on **Vercel**. `render.yaml` describes the API as a Blueprint.

### API → Render

| Setting | Value |
|---|---|
| Root Directory | `apps/api` |
| Build Command | `pnpm install --frozen-lockfile && pnpm run build` |
| Start Command | `pnpm start` |
| Health Check Path | `/health` |

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `MONGODB_URI` | yes | Atlas string including the database name. Allow `0.0.0.0/0` in Atlas Network Access |
| `JWT_SECRET` | yes | 32+ characters: `openssl rand -base64 48` |
| `CORS_ORIGIN` | yes | `https://servicebook-drab.vercel.app`. Comma-separate others; `https://servicebook-*.vercel.app` allows previews |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `EMAIL_PROVIDER` | no | `console` (default, logs emails) or `resend` |
| `EMAIL_FROM`, `EMAIL_API_KEY` | with `resend` | Sender and Resend API key |
| `ADMIN_EMAILS` | no | Comma-separated emails that can change roadmap statuses |
| `SEED_DEMO` | no | Default `true`: keeps the demo salon available and fresh. Set `false` to skip it |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | no | Push keys. Generated and stored automatically if unset |

The API stops at start-up with a clear message if a required variable is missing.

### Web → Vercel

Import the repo with **Root Directory** `apps/web` (framework: Vite).
- **API URL:** `apps/web/.env.production` points at the Render API. Set `VITE_API_URL` (no trailing slash) to override it. It's baked in at build time, so redeploy after changing it.
- **Deep links:** `vercel.json` makes links like `/dashboard` and `/book/your-business` work on refresh.
