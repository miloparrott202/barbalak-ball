# Barbalak-Ball

Real-time party game built with Next.js, Supabase, and Tailwind CSS.

## Getting Started

### 1. Set up Supabase

Create a new project at [supabase.com](https://supabase.com), then run the SQL in `supabase/schema.sql` in the **SQL Editor** to create the `games` and `players` tables with RLS policies.

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project Settings > API.

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page — host a new game |
| `/host/[code]` | Host lobby — QR code, player list, Phoneless Phil |
| `/host/[code]/settings` | Game settings — categories & difficulty |
| `/host/[code]/play` | Placeholder game screen |
| `/join/[code]` | Player join flow (mobile-first) |

## Tech Stack

- **Next.js 16** (App Router)
- **Tailwind CSS 4**
- **Supabase** (Postgres + Realtime)
- **qrcode.react** for QR generation
- **lucide-react** for icons

## Deploy

Push to GitHub and import the repo on [vercel.com](https://vercel.com). Add the two `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel project settings.
