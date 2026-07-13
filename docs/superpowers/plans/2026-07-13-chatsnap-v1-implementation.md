# ChatSnap v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bilingual (EN/FR) mobile PWA where friends send ephemeral photo/video snaps with a view-once timer, backed by Supabase.

**Architecture:** Vite + React + TypeScript SPA/PWA at repo root `frontend/`. Supabase Auth + Postgres + Storage with RLS. Client uses supabase-js; camera via getUserMedia; horizontal swipe between Camera and Inbox.

**Tech Stack:** React 18, Vite 6, TypeScript, React Router, @supabase/supabase-js, vite-plugin-pwa, lightweight i18n dictionaries, Netlify static deploy.

**Spec:** `docs/superpowers/specs/2026-07-13-chatsnap-v1-design.md`

---

## File map

```
frontend/
  index.html
  package.json
  vite.config.ts
  public/manifest icons
  src/
    main.tsx
    App.tsx
    styles/global.css          # Sunny Pop tokens
    lib/supabase.ts
    lib/i18n.tsx               # EN/FR provider
    locales/en.ts
    locales/fr.ts
    contexts/AuthContext.tsx
    hooks/useCamera.ts
    components/BottomChrome.tsx
    components/LanguageToggle.tsx
    components/SwipeShell.tsx  # Camera ↔ Inbox
    pages/AuthPage.tsx
    pages/CameraPage.tsx
    pages/SendToPage.tsx
    pages/InboxPage.tsx
    pages/ViewerPage.tsx
    pages/FriendsPage.tsx
    pages/MePage.tsx
    pages/UsernameGate.tsx
supabase/
  migrations/0001_chatsnap_init.sql
netlify.toml                   # base frontend, dist
README.md
.env.example
```

---

### Task 1: Scaffold frontend

**Files:**
- Create: `frontend/*` (Vite React-TS)
- Create: `netlify.toml`, `.env.example`, root `README.md`

- [ ] **Step 1:** `npm create vite@latest frontend -- --template react-ts`
- [ ] **Step 2:** Install deps: `react-router-dom @supabase/supabase-js vite-plugin-pwa`
- [ ] **Step 3:** Configure `vite.config.ts` with PWA plugin + path alias `@`
- [ ] **Step 4:** `npm run build` succeeds
- [ ] **Step 5:** Commit `chore: scaffold Vite React PWA frontend`

---

### Task 2: Design system + i18n

**Files:**
- Create: `frontend/src/styles/global.css`
- Create: `frontend/src/locales/en.ts`, `fr.ts`
- Create: `frontend/src/lib/i18n.tsx`

- [ ] **Step 1:** CSS variables: `--bg #0A0A0A`, `--accent #FFFC00`, fonts
- [ ] **Step 2:** String dictionaries for all chrome (auth, camera, inbox, friends, me, errors)
- [ ] **Step 3:** `I18nProvider` + `useT()` + `setLocale('en'|'fr')` persisted to localStorage
- [ ] **Step 4:** Default locale from `navigator.language` starting with `fr` → fr else en
- [ ] **Step 5:** Commit `feat: Sunny Pop theme and EN/FR i18n`

---

### Task 3: Supabase client + Auth shell

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/pages/AuthPage.tsx`
- Create: `frontend/src/pages/UsernameGate.tsx`

- [ ] **Step 1:** Client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; graceful null if missing (demo mode banner)
- [ ] **Step 2:** AuthContext: session, user, profile, signInWithPassword, signUp, signOut, signInWithOtp
- [ ] **Step 3:** Auth page UI Sunny Pop
- [ ] **Step 4:** Username gate if profile.username null
- [ ] **Step 5:** Commit `feat: auth context and login UI`

---

### Task 4: App shell + swipe navigation

**Files:**
- Create: `frontend/src/components/SwipeShell.tsx`
- Create: `frontend/src/components/BottomChrome.tsx`
- Create: `frontend/src/components/LanguageToggle.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1:** Routes: `/auth`, `/app` (shell), `/friends`, `/me`, `/send`, `/view/:recipientId`
- [ ] **Step 2:** SwipeShell: CSS scroll-snap horizontal, two panels Camera | Inbox, default Camera
- [ ] **Step 3:** BottomChrome: Friends · Camera · Inbox · Me (highlight active)
- [ ] **Step 4:** Commit `feat: swipe shell Camera↔Inbox`

---

### Task 5: Database migration

**Files:**
- Create: `supabase/migrations/0001_chatsnap_init.sql`

- [ ] **Step 1:** Tables: profiles, friendships, snaps, snap_recipients (+ indexes)
- [ ] **Step 2:** Trigger: on auth.users insert → profiles row
- [ ] **Step 3:** RLS policies per design
- [ ] **Step 4:** Storage bucket `snaps` private + policies
- [ ] **Step 5:** Commit `feat(db): chatsnap schema RLS and storage`

---

### Task 6: Friends

**Files:**
- Create: `frontend/src/pages/FriendsPage.tsx`
- Create: `frontend/src/lib/friends.ts`

- [ ] **Step 1:** Search profile by username
- [ ] **Step 2:** Send request / accept / list accepted
- [ ] **Step 3:** Commit `feat: friends request and accept`

---

### Task 7: Camera + send snap

**Files:**
- Create: `frontend/src/hooks/useCamera.ts`
- Create: `frontend/src/pages/CameraPage.tsx`
- Create: `frontend/src/pages/SendToPage.tsx`
- Create: `frontend/src/lib/snaps.ts`

- [ ] **Step 1:** getUserMedia preview, flip, photo capture, video ≤15s
- [ ] **Step 2:** Send-to multi-select friends + duration 1–10
- [ ] **Step 3:** Upload storage + insert snap + recipients
- [ ] **Step 4:** Commit `feat: camera capture and send snap`

---

### Task 8: Inbox + viewer

**Files:**
- Create: `frontend/src/pages/InboxPage.tsx`
- Create: `frontend/src/pages/ViewerPage.tsx`

- [ ] **Step 1:** List pending snap_recipients for me (join sender profile)
- [ ] **Step 2:** Viewer: signed URL, countdown, mark consumed
- [ ] **Step 3:** Commit `feat: inbox and ephemeral viewer`

---

### Task 9: Me page + PWA polish + Netlify

**Files:**
- Create: `frontend/src/pages/MePage.tsx`
- Modify: `netlify.toml`, `README.md`

- [ ] **Step 1:** Me: username, language, sign out
- [ ] **Step 2:** Manifest name ChatSnap, theme #0A0A0A, yellow icons placeholder
- [ ] **Step 3:** netlify.toml: base = frontend, command npm run build, publish dist
- [ ] **Step 4:** README: env vars, Supabase setup, Netlify fields
- [ ] **Step 5:** Commit `docs: deploy and setup README`

---

### Task 10: Smoke verification

- [ ] `npm run build` clean
- [ ] Manual: open app without env shows setup banner
- [ ] With Supabase: signup → username → friend → snap → view → gone

---

## Netlify settings (after Task 1+)

| Field | Value |
|--------|--------|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/dist` |
| Functions | leave default / unused |
| Runtime | Node 20 |

---

## You (human) after code lands

1. Create Supabase project  
2. Run `0001_chatsnap_init.sql` in SQL editor  
3. Enable Email auth (and optional Google)  
4. Copy URL + anon key → Netlify env `VITE_SUPABASE_*` and local `.env`  
5. Connect Netlify to `chatsnap-new` repo with settings above  

---

## Spec coverage check

| Spec item | Tasks |
|-----------|--------|
| Camera + snaps | 7 |
| Friends only | 6 |
| View once + timer | 8 |
| EN/FR UI | 2 |
| Mobile PWA | 1, 9 |
| Supabase | 3, 5 |
| Sunny Pop | 2 |
| Swipe Camera↔Inbox | 4 |
| Out of scope (stories/chat) | not planned |
