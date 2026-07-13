# ChatSnap

Fun **bilingual (EN/FR)** Snapchat-style PWA — camera-first, friends-only, view-once snaps.

Design: [`docs/superpowers/specs/2026-07-13-chatsnap-v1-design.md`](docs/superpowers/specs/2026-07-13-chatsnap-v1-design.md)  
Plan: [`docs/superpowers/plans/2026-07-13-chatsnap-v1-implementation.md`](docs/superpowers/plans/2026-07-13-chatsnap-v1-implementation.md)

## Stack

- **Frontend:** Vite + React + TypeScript (PWA) in `frontend/`
- **Backend:** Supabase (Auth, Postgres, Storage, RLS)
- **Deploy:** Netlify (`netlify.toml` included)

## Quick start (UI demo)

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5174 — without Supabase env vars the app runs in **demo mode** (camera + chrome UI; no real send).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → run `supabase/migrations/0001_chatsnap_init.sql`
3. Auth → enable **Email** (and optional Google)
4. Copy **Project URL** + **anon public** key
5. Local:

```bash
cd frontend
cp .env.example .env
# edit VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Netlify settings

| Field | Value |
|--------|--------|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/dist` (or `dist` when base is `frontend`) |
| Runtime / Node | **20** |
| Functions | not required |

Environment variables on Netlify:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Scripts

```bash
cd frontend
npm run dev      # local
npm run build    # production
npm run preview  # preview build
```

## License

See [LICENSE](LICENSE).
