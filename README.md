# The Pulse — Live Deployment Guide

## What's in this folder
```
the-pulse-live/
├── index.html          ← Frontend (updated to call backend)
├── manifest.json       ← PWA installability
├── vercel.json         ← Vercel routing config
├── package.json        ← Dependencies
└── api/
    ├── pulse.js        ← Fetches RSS + rewrites with Claude
    └── votes.js        ← Supabase vote persistence
```

---

## Step 1: Set environment variables in Vercel

After deploying, go to:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these three:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your key from console.anthropic.com |
| `SUPABASE_URL` | `https://azfffmkqwfbbrumotgpc.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (your anon key) |

---

## Step 2: Deploy to Vercel

1. Go to **vercel.com**
2. Click **"Add New Project"**
3. Click **"Import"** → choose **"Upload"** (drag folder)
4. Drag the entire `the-pulse-live` folder
5. Click **Deploy**
6. Wait ~60 seconds
7. Your app is live at `the-pulse-xxxx.vercel.app`

---

## Step 3: Redeploy after adding env vars

After adding environment variables, click **"Redeploy"** in Vercel dashboard.

---

## Step 4: Test it

1. Open your live URL
2. Wait for loading sequence (~8 seconds for live news)
3. Stories should be today's real news rewritten in Pulse voice
4. Cast a Versus vote — refresh — vote should persist

---

## Supabase table (already created)
```sql
CREATE TABLE versus_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id text NOT NULL,
  option text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

---

## Custom domain (optional)
1. Buy domain on namecheap.com (~$10/yr)
2. In Vercel: Settings → Domains → Add domain
3. Follow DNS instructions (takes ~10 mins to propagate)

---

Built with Claude · The Pulse · 2026
