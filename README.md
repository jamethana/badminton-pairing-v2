# Badminton Pairing App

A real-time badminton session management app built with Next.js, Supabase, and Line Login.

## Features

- **Line Login** – players sign in with their LINE account
- **Moderator Dashboard** – create sessions, manage players, assign courts
- **Smart Pairing Algorithm** – auto-generates skill-balanced pairs with sitting-priority rotation
- **Live Court Dashboard** – real-time view of active games, available players, and results
- **Player Views** – join sessions, claim name-slots, see current games, record results
- **Statistics** – per-player win/loss tracking across sessions

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Auth**: Custom Line Login OAuth flow
- **Deployment**: Vercel

---

## Local Development

1. Copy `.env.example` to `.env.local` and fill in values:
   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

---

## Deployment Guide

### 1. Deploy to Vercel

**Option A – Vercel Dashboard (recommended)**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository `jamethana/badminton-pairing-v2`
3. Set **Root Directory** to the project folder (if needed)
4. Add the environment variables below in **Settings → Environment Variables**
5. Deploy

**Option B – Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 2. Environment Variables on Vercel

Add these in your Vercel project's **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ibcnopjypgupkonxvwkb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `LINE_CHANNEL_ID` | Your LINE Login Channel ID |
| `LINE_CHANNEL_SECRET` | Your LINE Login Channel Secret |
| `NEXT_PUBLIC_LINE_CALLBACK_URL` | `https://your-app.vercel.app/api/auth/callback` |

---

### 3. Line Login Channel Setup

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new **LINE Login** channel (or use an existing one)
3. Under **LINE Login** tab → **Callback URL**, add:
   ```
   https://your-app.vercel.app/api/auth/callback
   ```
   For local dev also add: `http://localhost:3000/api/auth/callback`
4. Note your **Channel ID** and **Channel Secret** from the **Basic settings** tab
5. Add them to Vercel environment variables (step 2 above)

### 4. Supabase Configuration

#### Database Schema

The schema lives in `supabase/migrations/001_baseline_schema.sql` — a single authoritative file
that defines all tables, enums, functions, triggers, indexes, and Realtime publication.

To apply it to a fresh Supabase project:
1. Open the Supabase dashboard → **SQL Editor**
2. Paste the contents of `supabase/migrations/001_baseline_schema.sql` and run it.

Or via the Supabase MCP tool `apply_migration`, which also records the migration version.

**Adding new migrations**: Create incremental files named `002_<feature>.sql`, `003_<feature>.sql`,
etc. — never edit `001_baseline_schema.sql` after initial deployment.

**Resetting (dev/staging)**: Drop all public schema objects, clear `supabase_migrations.schema_migrations`,
then re-apply the baseline (and any subsequent numbered migrations).

Make sure:

- **Authentication → URL Configuration** in Supabase dashboard:
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `https://your-app.vercel.app/**`

### 5. Set First Moderator

After your first login via LINE:

1. Go to Supabase Dashboard → Table Editor → `users`
2. Find your user record and set `is_moderator = true`
3. Refresh the app – you'll now see the Moderator Dashboard

---

## Architecture Notes

### Authentication Flow

1. User clicks "Login with LINE" → redirected to LINE OAuth
2. LINE redirects back to `/api/auth/callback` with auth code
3. App exchanges code for LINE profile → upserts record in `users` table
4. Supabase Auth session created using deterministic email/password
5. Middleware protects all routes except `/login` and `/api/auth`

### Pairing Algorithm

The `lib/algorithms/pairing.ts` algorithm selects 4 players per court by scoring candidates on:

- **Sitting priority** (weight 3): players who sat longest get preference
- **Match count fairness** (weight 2): players who played fewer games
- **Skill balance**: teams are formed to minimize skill gap
- **Partner/opponent variety**: avoids repeating past pairings

The best 4 players are split into balanced teams, automatically suggested to the moderator who can then swap any player before confirming.
