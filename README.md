# Career Ops — Dashboard

A multi-dashboard web app for running a small team's career operations:
track job applications from Gmail, log time, browse jobs, manage SOPs and
contracts, and review your hiring pipeline.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**. Data is
persisted in your browser (localStorage) so the prototype works with zero
backend setup; the Gmail integration is real and activates as soon as you add
Google credentials.

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

```bash
npm install            # also generates the Prisma client
cp .env.example .env   # local default uses a SQLite file — no DB server needed
npm run setup          # creates the database and loads sample data
npm run dev
```

Open <http://localhost:3000>.

The app ships with realistic **sample data** (3 users + applications, time
entries, SOPs, contracts, applicants and listings) so every dashboard is
populated immediately.

## Data & persistence

Data is stored in a real database via **Prisma**. All reads/writes go through
REST API routes under `/api`:

- `GET /api/bootstrap` — loads every collection on startup
- `POST /api/<resource>` / `PATCH /api/<resource>/<id>` / `DELETE …` — generic
  CRUD for `applications`, `time-entries`, `sops`, `contracts`, `applicants`,
  `listings`

Locally the database is a zero-setup **SQLite** file (`prisma/dev.db`). The same
schema runs on **Postgres** for production (see Deployment). Useful scripts:

```bash
npm run db:seed    # reload sample data
npm run db:reset   # drop, re-migrate and re-seed
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

The app deploys to any Next.js host. Since SQLite files don't persist on
serverless platforms, switch to **Postgres** for production. On Vercel + a free
managed Postgres (Neon / Vercel Postgres / Supabase):

1. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Create a Postgres database and copy its connection string.
3. Push the schema and (optionally) seed it:
   ```bash
   DATABASE_URL="postgresql://…" npx prisma db push
   DATABASE_URL="postgresql://…" npm run db:seed
   ```
4. Push this repo to GitHub and import it in Vercel.
5. In Vercel → Project → Settings → Environment Variables, set:
   - `DATABASE_URL` — your Postgres connection string
   - (optional) `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
     `GOOGLE_REDIRECT_URI` (`https://YOUR-DOMAIN/api/gmail/callback`)
6. Deploy. The build runs `prisma generate && next build` automatically.

> `npm run db:push` uses the schema directly, so the SQLite migration files in
> `prisma/migrations/` (which are SQLite-dialect) don't need to be replayed on
> Postgres.

## Notes

- Uploaded PDFs are stored as data URLs (text) in the database, so keep uploads
  small — the uploader caps files at 8 MB.
- Gmail is accessed **read-only**; OAuth tokens live in `.gmail-tokens.json`
  (gitignored) locally. For production, move token storage into the database.
