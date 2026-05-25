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
npm install
npm run dev
```

Open <http://localhost:3000>.

The app ships with realistic **sample data** so every dashboard is populated
immediately.

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

## Notes

- This is a front-end prototype: app data (applications, time, SOPs, contracts,
  applicants) lives in the browser's localStorage. Clearing site data resets it
  to the sample set. Swapping in a real database is the natural next step.
- Uploaded PDFs are stored as data URLs in localStorage, so keep sample uploads
  small (the uploader caps files at 8 MB).
