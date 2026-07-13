# ChatSnap v1 — Design Spec

**Date:** 2026-07-13  
**Repo:** `brandonlacoste9-tech/chatsnap-new`  
**Status:** Draft for user review  

## Vision

ChatSnap is a **fun, bilingual (EN/FR) Snapchat-style app** built from scratch.  
**v1 spine:** open to **camera**, send **ephemeral snaps** to **friends only**, open with a **short timer**, then gone.

Not a TikTok clone (that’s Zyeuté). ChatSnap is private, playful, camera-first.

---

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Core experience | Camera + Snaps |
| Bilingual | Full **UI EN/FR toggle** (no auto-translate of media) |
| Platform | **Mobile web / PWA** first |
| Audience model | **Friends only** (request → accept) |
| Backend | **Supabase** (Auth, Postgres, Storage, RLS) |
| Ephemerality | **View once + short timer** (1–10s) |
| Build approach | **A — Lean Snap Loop** |
| Visual vibe | **Sunny Pop** — black UI, bright yellow accent |
| Navigation | **Swipe** between Camera ↔ Inbox (Snap-like), plus tab/chrome for Friends & Me |

---

## Goals & non-goals

### Goals (v1)

- Sign up / login; unique `@username`
- Add friends by username (pending → accepted)
- Capture **photo** and **short video** (≤15s), front/back camera
- Send snap to one or many friends with duration 1–10s
- Inbox of unopened snaps
- Full-screen viewer with countdown → mark consumed → media inaccessible
- EN/FR interface strings; default from browser locale
- Installable PWA (manifest + service worker basic)

### Non-goals (v1)

- Stories, Spotlight, Map, Bitmoji, AR lenses
- Text chat, group chat, voice notes
- Screenshot detection / alerts (web cannot guarantee)
- Payments, ads
- Streaks (optional v1.1 — do not block v1)
- Native iOS/Android apps (PWA only)

---

## Architecture

```
┌─────────────────────────────────────────┐
│  PWA (Vite + React + TypeScript)        │
│  i18n (en, fr) · camera · swipe shells  │
└─────────────────┬───────────────────────┘
                  │ supabase-js
┌─────────────────▼───────────────────────┐
│  Supabase                               │
│  Auth · Postgres + RLS · Storage        │
│  (Realtime optional; poll OK for v1)    │
└─────────────────────────────────────────┘
```

### Client stack

- **Vite + React 18 + TypeScript**
- **React Router** (or simple shell with gesture pager for Camera/Inbox)
- **@supabase/supabase-js**
- **i18next** or lightweight custom dictionaries (`en.json` / `fr.json`)
- **PWA:** `vite-plugin-pwa` (or manual manifest)
- Camera: `getUserMedia` + `MediaRecorder` for video; canvas/blob for photo

### Backend (Supabase)

- **Auth:** email magic link and/or Google OAuth; profile row created on first login
- **Storage:** private bucket `snaps` — paths like `{sender_id}/{snap_id}.{ext}`
- **Signed URLs** for upload and for recipient view (short TTL)
- **RLS:** sender and accepted-friend recipients only
- **Jobs (nice-to-have):** storage cleanup for consumed/expired snaps (cron edge function later)

### Snap lifecycle

1. User captures media → client compresses
2. Upload to Storage (authenticated)
3. Insert `snaps` + `snap_recipients` rows (`status = pending`)
4. Recipient sees entry in Inbox
5. Open → signed URL → full-screen viewer → countdown `duration_sec`
6. On complete / leave: `status = consumed`, opened_at set; media deleted or URL revoked
7. Unopened snaps expire after **24h** (`expires_at`) even if never opened

---

## Product surfaces

### Shell / navigation

- **Primary gesture:** horizontal swipe between **Camera** (center/default) and **Inbox**
- **Secondary tabs/chrome:** **Friends**, **Me** (profile + language + logout)
- Header: app mark + **EN | FR** language control

### Screens

1. **Auth** — login / signup, pick username if new  
2. **Camera** — shutter, flip, flash (if available), mode photo/video, duration for send  
3. **Send-to** — multi-select accepted friends, duration chips 1–10s, Send  
4. **Inbox** — list of unopened snaps (avatar, username, media type icon)  
5. **Viewer** — full screen, no pause chrome required; countdown; consume on end  
6. **Friends** — search username, pending requests, accepted list  
7. **Me** — profile, language, sign out  

### Empty & error states

- No camera permission → clear EN/FR copy + link to browser settings  
- Upload fail → retry toast  
- Snap already opened / expired → friendly “already vanished” state  
- Offline → disable send; show cached inbox if any  

---

## Data model

### `profiles`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | = auth.users.id |
| username | text unique | lowercase, validated |
| display_name | text | |
| avatar_url | text null | |
| locale | text | `en` \| `fr` |
| created_at | timestamptz | |

### `friendships`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| requester_id | uuid | → profiles |
| addressee_id | uuid | → profiles |
| status | text | `pending` \| `accepted` \| `blocked` |
| created_at | timestamptz | |
| Unique (requester_id, addressee_id) | | |

### `snaps`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| sender_id | uuid | |
| media_path | text | storage path |
| media_type | text | `image` \| `video` |
| duration_sec | int | 1–10 |
| created_at | timestamptz | |
| expires_at | timestamptz | created + 24h |

### `snap_recipients`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| snap_id | uuid | |
| recipient_id | uuid | |
| status | text | `pending` \| `opened` \| `consumed` |
| opened_at | timestamptz null | |
| Unique (snap_id, recipient_id) | | |

### RLS principles

- Profile: public read of username for friend search; write own only  
- Friendships: participants only  
- Snaps: sender full read; recipients read only their recipient row + parent snap if status allows  
- Storage: path policy tied to sender upload; recipient read only while `pending`/`opened` and not expired  

---

## i18n

- All chrome strings in `en` and `fr`  
- French should feel natural (Canadian FR welcome; not mandatory deep joual)  
- User `profiles.locale` persists preference  
- Toggle in header updates immediately  

---

## Visual design — Sunny Pop

- Background: near-black `#0A0A0A`  
- Accent: snap-yellow `#FFFC00` (buttons, shutter ring, active tab)  
- Text: white / muted gray  
- Rounded full-screen camera; large circular shutter  
- Soft shadows minimal; playful, high contrast  
- Safe for trademark: do not copy Snapchat logo/ghost; original **ChatSnap** wordmark  

---

## Security & privacy (v1 honest limits)

- Snaps are private between friends via RLS + private bucket  
- Web cannot prevent screenshots or screen recording reliably — no false claims  
- View-once is **best-effort product rule**, not DRM  
- Rate-limit friend requests and snap sends (edge or DB) to reduce abuse  

---

## Testing strategy

- Unit: username validation, friendship state machine, snap status transitions  
- Integration: Supabase RLS policies (sender/recipient/stranger)  
- Manual: real phone camera on HTTPS/localhost, PWA install, EN/FR flip  
- E2E later: Playwright happy path login → friend → send → open  

---

## Project layout (proposed)

```
chatsnap-new/
  docs/superpowers/specs/     # this design
  apps/web/                   # Vite React PWA (or root /frontend — pick one in plan)
  supabase/migrations/        # SQL
  README.md
```

Prefer **root `frontend/`** or monorepo `apps/web/` — implementation plan will pick one; default **`frontend/`** at repo root for simplicity.

---

## Success criteria

1. Two real users can friend each other and exchange a photo snap end-to-end  
2. Snap disappears after timer; second open fails  
3. UI fully switchable EN ↔ FR  
4. App usable as installed PWA on mobile Chrome/Safari  
5. No stories/chat/map in the shipped v1 surface  

---

## Follow-ups (not v1)

- Streaks  
- Text chat beside snaps  
- Filters / stickers  
- Native shells  
- Push notifications (web push)  

---

## Open implementation choices (plan may decide)

- Magic link vs Google-first OAuth (both fine; ship at least one)  
- Video codec/size caps for mobile upload  
- Exact gesture library (CSS scroll-snap vs custom)

