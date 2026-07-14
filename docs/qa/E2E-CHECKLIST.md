# ChatSnap E2E Checklist (Phase A1.1)

**Date:** 2026-07-14  
**Live:** https://chatsnap-app.netlify.app  
**Project:** `zzlaytfkqmbslcygnmrc`  
**Goal:** Auth → friend → snap → react → chat → story → spotlight → group works on **2 devices**.

Use **two browsers** (or phone + desktop). Call them **A** (you) and **B** (friend).  
Private/incognito for B is fine.

**Prerequisite:** Prefer finishing [secret rotation](../security/SECRET-ROTATION.md) first. App may still work with current keys.

---

## How to mark results

| Symbol | Meaning |
|--------|---------|
| ✅ | Pass |
| ❌ | Fail (note error text) |
| ⚠️ | Partial / flaky |
| ⬜ | Not run yet |
| 🤖 | Automated check (agent) |

---

## 0. Infrastructure (automated 2026-07-14)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 0.1 | Live site `GET /` returns 200 + `#root` + JS assets | 🤖 ✅ | Netlify SPA shell |
| 0.2 | SPA fallback routes 200 | 🤖 ✅ | `/auth` `/friends` `/chats` `/discover` `/me` `/map` `/memories` `/groups` |
| 0.3 | Supabase REST reachable with anon key | 🤖 ✅ | `profiles`, `friendships`, `snaps`, `messages`, `stories`, etc. → 200 |
| 0.4 | All expected public tables exist | 🤖 ✅ | 19 tables incl. groups, memories, blocks, stickers, reports |
| 0.5 | Storage bucket `snaps` + policies | 🤖 ✅ | upload / select / delete policies present |
| 0.6 | `frontend/.env` present locally (gitignored) | 🤖 ✅ | URL + anon configured |
| 0.7 | Secrets not tracked by git | 🤖 ✅ | `.env` / `.local` ignored |

**Infra gate:** ✅ Ready for manual product E2E.

---

## 1. Auth & profile

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 1.1 | Open live site (hard refresh) | ⬜ | ⬜ | |
| 1.2 | Sign up with **new** email/password | ⬜ | ⬜ | Use two different emails |
| 1.3 | Land on username gate if needed | ⬜ | ⬜ | |
| 1.4 | Pick unique `@username` (3–20, a-z0-9_) | ⬜ | ⬜ | e.g. `@alpha_e2e` / `@beta_e2e` |
| 1.5 | Log out → log in again | ⬜ | ⬜ | Session persists |
| 1.6 | **Me**: EN / FR toggle works | ⬜ | ⬜ | All chrome strings switch |
| 1.7 | **Me**: set vibe status, save | ⬜ | ⬜ | Shows under name |

**Pass criteria:** Both users authenticated with usernames.

---

## 2. Friends

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 2.1 | **Friends**: see own @username + Copy | ⬜ | | |
| 2.2 | **Share invite** copies/opens share sheet | ⬜ | | Link `/add/{user}` |
| 2.3 | B opens invite link (or searches A) | | ⬜ | |
| 2.4 | Send friend request | ⬜ | ⬜ | Either direction |
| 2.5 | Accept request | ⬜ | ⬜ | |
| 2.6 | Both appear under Friends list | ⬜ | ⬜ | |
| 2.7 | Discover list does not show self | ⬜ | ⬜ | |
| 2.8 | Block from Friends (optional) then unblock only if tested | ⬜ | | Destructive — optional |

**Pass criteria:** A ↔ B are accepted friends.

---

## 3. Camera → private snap → react

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 3.1 | Camera: allow permission | ⬜ | | Or use **Gallery** |
| 3.2 | **SNAP** photo (or gallery pick) | ⬜ | | |
| 3.3 | Editor: draw / emoji / custom sticker | ⬜ | | Skip OK |
| 3.4 | Send: destination **Friends**, pick B, duration 5s | ⬜ | | Caption optional |
| 3.5 | **Save to Memories** checked | ⬜ | | Default on |
| 3.6 | Toast “Snap sent” | ⬜ | | |
| 3.7 | B: Inbox badge / list shows snap | | ⬜ | Realtime or few seconds |
| 3.8 | B: open snap, countdown works | | ⬜ | |
| 3.9 | B: tap reaction 🔥😂… | | ⬜ | |
| 3.10 | Snap consumed / gone on re-open | | ⬜ | |
| 3.11 | A: Inbox → **Sent** shows opened + reaction | ⬜ | | |
| 3.12 | A: **Me → Memories** shows saved item | ⬜ | | |

**Pass criteria:** Full private snap loop + reaction + memory.

---

## 4. Stories

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 4.1 | Friends rail **+ My Story** or send dest **My Story** | ⬜ | | |
| 4.2 | Post story with caption | ⬜ | | |
| 4.3 | A ring appears on Friends | ⬜ | | |
| 4.4 | B sees A’s ring (yellow if unwatched) | | ⬜ | |
| 4.5 | B watches story; progress / tap next | | ⬜ | |
| 4.6 | After watch, ring style updates (seen) | | ⬜ | |

**Pass criteria:** B can view A’s 24h story.

---

## 5. Spotlight / Discover

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 5.1 | Send dest **Spotlight**, post | ⬜ | | Skip if restricted mode on |
| 5.2 | **Discover** shows post | ⬜ | ⬜ | |
| 5.3 | Like 🔥 increments | ⬜ | ⬜ | |
| 5.4 | Restricted mode on A: Discover hidden/disabled | ⬜ | | Optional safety check |

**Pass criteria:** Public post visible to B + like works.

---

## 6. Chat (1:1)

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 6.1 | Open chat (Friends 💬 or Chat tab) | ⬜ | ⬜ | |
| 6.2 | Send normal text | ⬜ | | |
| 6.3 | B receives (realtime ~instant) | | ⬜ | |
| 6.4 | B replies | | ⬜ | |
| 6.5 | **EN⇄FR** on a message | ⬜ | | Translation appears |
| 6.6 | 👻 ghost note → B reads → vanishes | ⬜ | ⬜ | |
| 6.7 | 🎤 voice note send + play | ⬜ | ⬜ | Mic permission |
| 6.8 | Chat list shows vibe + preview | ⬜ | ⬜ | |

**Pass criteria:** Text + translate + ghost or voice.

---

## 7. Groups

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 7.1 | Chat → **Groups** → New group | ⬜ | | Include B |
| 7.2 | Both open group thread | ⬜ | ⬜ | |
| 7.3 | A sends text; B sees | ⬜ | ⬜ | |
| 7.4 | Voice note in group | ⬜ | ⬜ | Optional |

**Pass criteria:** Group text works both ways.

---

## 8. Map & safety

| # | Step | A | B | Notes |
|---|------|---|---|-------|
| 8.1 | Map: Share my location (allow GPS) | ⬜ | | |
| 8.2 | B shares too → pins appear | ⬜ | ⬜ | Friends only |
| 8.3 | Turn sharing off → pin gone for others | ⬜ | ⬜ | |
| 8.4 | Report from chat 🚩 | ⬜ | | Optional; no PII in reason |
| 8.5 | Block (only if OK to re-add later) | ⬜ | | Optional |

**Pass criteria:** Opt-in map works; no location leak when off.

---

## 9. Stickers & captions

| # | Step | A | Notes |
|---|------|---|-------|
| 9.1 | Me → Stickers → upload image | ⬜ | |
| 9.2 | SNAP → editor → My stickers → place | ⬜ | |
| 9.3 | Send screen: smart caption chips apply | ⬜ | EN/FR/QC |

**Pass criteria:** Custom sticker on a sent snap.

---

## 10. PWA / install (device)

| # | Step | Phone | Notes |
|---|------|-------|-------|
| 10.1 | Add to Home Screen | ⬜ | iOS Safari / Android Chrome |
| 10.2 | Opens standalone (no browser chrome-ish) | ⬜ | |
| 10.3 | Camera works from installed PWA | ⬜ | |
| 10.4 | After deploy, hard refresh / update SW | ⬜ | |

---

## 11. Known automated limitations

| Item | Detail |
|------|--------|
| Full auth E2E | Needs real emails / human 2FA / captcha — manual |
| Camera | Needs physical device permissions |
| Realtime | Manual “feels instant” judgment |
| Storage upload | Covered only via full product flows |
| PAT still valid | Management API worked at checklist time — **rotate if not done** |

---

## 12. RLS quick matrix (manual spot-check)

Use two sessions. Expect:

| Action | Stranger | Friend | Self |
|--------|----------|--------|------|
| Read private snap not for you | ❌ | ✅ if recipient | ✅ if sender |
| List other’s memories | ❌ | ❌ | ✅ |
| Post spotlight | ✅ auth | ✅ | ✅ |
| Message non-friend | ❌ | ✅ | — |
| See map pin without opt-in | ❌ | ❌ | ✅ own |
| See map pin friend opted-in | ❌ | ✅ | ✅ |

⬜ Matrix spot-checked (optional deep pass)

---

## 13. Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Runner A | | | ⬜ Pass / ⬜ Fail |
| Runner B | | | ⬜ Pass / ⬜ Fail |
| Blockers | | | |

**Overall:** ⬜ Ready for daily crew use · ⬜ Needs fixes first

### Top 3 bugs found

1.  
2.  
3.  

---

## 14. After checklist

- File bugs as GitHub issues on `chatsnap-new` (one issue per bug).  
- Fix P0 (can’t auth / can’t snap / data leak) before new features.  
- Next roadmap items: **A2 PWA polish**, **A4 onboarding**, or **B3.1 hive codes**.
