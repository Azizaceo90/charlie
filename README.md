# Career Ops — Dashboard

A multi-dashboard web app for running a small team's career operations:
track job applications from Gmail, log time, browse jobs, manage SOPs and
contracts, and review your hiring pipeline.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, backed by
**Postgres** via **Prisma**. The Gmail integration is real and activates as soon
as you add Google credentials.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Azizaceo90/charlie&env=DATABASE_URL&envDescription=Postgres%20connection%20string%20from%20Neon)

> One-click deploy needs a Postgres `DATABASE_URL` (a free
> [Neon](https://neon.tech) database). See [Deployment](#deployment-live-url).

## Dashboards

| Dashboard | What it does |
| --- | --- |
| **My Dashboard** | Your individual overview — recent applications, hours this week, contracts awaiting your signature, quick links. Each signed-in user sees their own. |
| **Job Applications** | Tracks **Applied / Assessment / Interview / Offer** automatically from Gmail, with **Today / Yesterday / Last 2 / 7 / 30 days / All** filters. Add applications manually too. |
| **Time Tracker** | Live clock in/out, project tagging, daily & weekly totals, hours-by-project breakdown, and manual entries. |
| **Insights** | Charts: applications over time, status breakdown, pipeline funnel, and hours tracked per day. |
| **Job Search** | Browse roles, save favorites, and apply in one click (which adds to your application tracker). |
| **SOPs** | Upload PDF playbooks and **read them inside the dashboard**. |
| **Contracts** | Admins issue PDF agreements; employees **view and e-sign** them with a drawn signature. |
| **Applicants** (admin) | A kanban hiring pipeline: Applied → Screening → Assessment → Interview → Offer → Hired / Rejected. |

## Roles

Pick a profile on the sign-in screen (prototype auth, no password):

- **Admin** (Jordan Cole) — sees everything, issues contracts, manages applicants.
- **Employee** (Maya Singh / Devon Parks) — personal dashboards, time tracking,
  and signs assigned contracts.

## Getting started

You need a **Postgres** connection string. A free [Neon](https://neon.tech)
database works for both local development and production — create a project and
copy its connection string.

```bash
npm install                       # also generates the Prisma client
cp .env.example .env              # then paste your DATABASE_URL into .env
npm run setup                     # creates the tables and loads sample data
npm run dev
```

Open <http://localhost:3000>.

The app ships with realistic **sample data** (3 users + applications, time
entries, SOPs, contracts, applicants and listings) so every dashboard is
populated immediately.

## Data & persistence

Data is stored in **Postgres** via **Prisma**. All reads/writes go through REST
API routes under `/api`:

- `GET /api/bootstrap` — loads every collection on startup (and auto-seeds
  sample data if the database is empty)
- `POST /api/<resource>` / `PATCH /api/<resource>/<id>` / `DELETE …` — generic
  CRUD for `applications`, `time-entries`, `sops`, `contracts`, `applicants`,
  `listings`

Useful scripts:

```bash
npm run db:push    # create/update tables to match the schema
npm run db:seed    # reload sample data
npm run db:reset   # wipe and re-seed
npx prisma studio  # browse/edit the database in a GUI
```

> Sign-in is a lightweight profile picker (no password) — the chosen profile id
> is the only thing kept in the browser. Swapping in real auth (e.g.
> NextAuth/Clerk) is the natural next step.

## Connecting real Gmail (optional)

The Job Applications dashboard reads your inbox and detects job-search emails.
To connect your real account:

1. Create a project at <https://console.cloud.google.com/>.
2. Enable the **Gmail API**.
3. Create an **OAuth 2.0 Client ID** (type: *Web application*) and add the
   redirect URI `http://localhost:3000/api/gmail/callback`.
4. Copy `.env.example` to `.env` and fill in `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.
5. Restart the dev server, then click **Connect Gmail**.

Tokens are stored locally in `.gmail-tokens.json` (gitignored) and Gmail is
accessed **read-only**.

## Deployment (live URL)

Deploys to **Vercel** with a free **Neon** Postgres database. You don't run any
commands — Vercel creates the tables on deploy (`vercel-build` runs
`prisma db push`), and the app seeds sample data automatically on first load.

1. **Database** — sign up at [neon.tech](https://neon.tech), create a project,
   and copy the **connection string** (`postgresql://…`).
2. **Hosting** — sign up at [vercel.com](https://vercel.com) with GitHub, then
   **Add New → Project** and import this repository.
3. In the import screen, open **Environment Variables** and add:
   - `DATABASE_URL` — the Neon connection string from step 1
   - *(optional, for real Gmail)* `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
     `GOOGLE_REDIRECT_URI` = `https://YOUR-DOMAIN/api/gmail/callback`
4. Click **Deploy**. In ~2 minutes you get a live URL.

Build settings are pre-configured in `vercel.json`, so there's nothing else to
change.

## Notes

- Uploaded PDFs are stored as data URLs (text) in the database, so keep uploads
  small — the uploader caps files at 8 MB.
- Gmail is accessed **read-only**; OAuth tokens live in `.gmail-tokens.json`
  (gitignored) locally. For production, move token storage into the database.
