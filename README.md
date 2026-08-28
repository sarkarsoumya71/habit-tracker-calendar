# Habit Tracker Calendar

A calendar for the things you're trying to do consistently. Day / Week / Month / Year
views like Google Calendar, a habit sidebar that filters the calendar down to the days
you actually showed up, and a year heatmap that answers "how often am I really doing this?"

Monochrome shell, monospace type. The only saturated colour on screen is your habits.

---

## What it does

- **Four views**, switched by keyboard or the segmented control:
  - **Day** — every habit for one date, with streaks and descriptions.
  - **Week** — a habit × day matrix. The fastest way to log; one click per cell.
  - **Month** — the overview. Each day shows which habits were logged and a fill bar for the day's share.
  - **Year** — twelve mini-months shaded by activity. Filter to one habit and the whole
    year becomes that habit's heatmap.
- **Double-click any day** to open it: tick habits off, or create a new one with a name,
  a colour, and a description.
- **Click a habit in the sidebar** to filter the calendar to it. Days where it wasn't done
  recede, and the footer tells you how many days matched in total. Ctrl/Cmd-click to stack
  several habits into the filter.
- **Insights panel** — current streak, longest streak, days logged, consistency,
  a 30-day sparkline, a by-weekday breakdown, and activity within the period on screen.
- **Accounts and sync** — sign in and your habits follow you to every device.
- **Works offline.** Everything is cached locally and writes are queued when there's no
  signal, then replayed automatically when you come back.
- **Export / import** a JSON backup from the sidebar footer.

### Keyboard

| Key | Action |
| --- | --- |
| `D` `W` `M` `Y` | Day / Week / Month / Year |
| `←` `→` | Previous / next period |
| `T` | Jump to today |
| `N` | New habit |
| `Esc` | Clear the habit filter, close dialogs |

---

## Install it on your phone

It's a PWA, so it installs from the browser — no app store, no sideloading, no APK.

- **Android (Chrome / Brave):** open the site → ⋮ menu → **Install app** (or *Add to home screen*).
- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.

You get a real home-screen icon, it opens fullscreen with no browser chrome, and it
works with no connection. Sign in with the same account on phone and desktop and both
stay in sync.

---

## Run it on this PC

**Start Menu → Habit Tracker Calendar** (also on the desktop) opens the deployed app in a
chromeless browser window. It is the same signed-in instance as the website, so the PC
and the browser share one account and one set of habits. No local server runs.

**Start Menu → Habit Tracker Calendar (Local)** is the offline copy: it serves the app on
`localhost:5058` with no database, so there is no account and habits stay in that browser
only. Useful for exporting data tracked before the site existed, and for testing a build
before pushing. Shut its server down with `powershell -File stop-server.ps1`.

Moving habits from the local copy into your account: open the local app, click the
download icon in the sidebar footer, then click the upload icon in the synced app and pick
that file. Habits match on name, so importing twice never duplicates anything.

## Setup

### 1. Database (enables accounts and cross-device sync)

Without a database the app still works — it just stores everything in the one browser
and hides the sign-in screen. To turn on sync:

1. Vercel dashboard → your project → **Storage** → **Create Database** → **Neon (Postgres)**.
2. Connect it to the project. Vercel injects `DATABASE_URL` into every environment.
3. Redeploy.

Tables are created automatically on first request — there's no migration step. Anything
you tracked before signing in is pushed up to your account the first time you log in.

### 2. Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

To develop against a real database, put the connection string in `.env.local`:

```
DATABASE_URL=postgres://...
```

---

## How it's built

| | |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database | Neon serverless Postgres (`@neondatabase/serverless`) |
| Auth | Email + password, scrypt hashing, server-side sessions in an HttpOnly cookie. No third-party auth provider. |
| Styling | Hand-written CSS with design tokens. No UI framework. |
| Offline | Service worker for the app shell; local cache plus a replayed write queue for data |

### Layout

```
src/
  app/
    page.tsx           the app shell: view state, filter, keyboard, dialogs
    layout.tsx         fonts, metadata, icons, PWA manifest wiring
    globals.css        the whole design system
    api/               auth, state, habits, entries, import
  components/          the four views, sidebar, insights rail, dialogs, icons
  lib/
    store.tsx          client data layer — optimistic writes, cache, offline queue
    date.ts            local-day maths, keyed "YYYY-MM-DD"
    stats.ts           streaks, consistency, weekday distribution
    db.ts / auth.ts    Postgres access and sessions
public/                icons, favicon, manifest, service worker
```

### Two things worth knowing

**Days are local, always.** Every date is keyed as a local `YYYY-MM-DD` string and never
round-trips through UTC, so a habit logged at 11pm stays on today rather than jumping to
tomorrow.

**The database is optional at every layer.** No `DATABASE_URL` means the API routes return
503 with a code the client understands, and it falls back to browser-local storage instead
of erroring.
