# ChatSnap — Full Product & Engineering Roadmap

**Date:** 2026-07-14  
**Repo:** `brandonlacoste9-tech/chatsnap-new`  
**Live:** https://chatsnap-app.netlify.app  
**North star:** *Not Snap. Ours.* — bilingual, consent-first, FOMO-light social for real crews (QC + EN/FR).

No rush. This plan is ordered for **value, risk, and dependency** — not “copy Snap’s backlog.”

---

## 0. Where we are (baseline)

### Shipped product surface

| Area | Status |
|------|--------|
| Auth + `@username` | Done (Supabase) |
| Camera / gallery / video | Done |
| Doodle + emoji + **custom stickers** | Done |
| Send → friends / story / Spotlight | Done |
| Private snaps + timer + reactions | Done |
| Stories (24h friends) | Done |
| Spotlight Discover (7d public) | Done |
| 1:1 chat + voice + ghost notes | Done |
| Groups | Done |
| EN⇄FR message translate | Done |
| Memories vault | Done |
| Opt-in friends map | Done |
| Streaks + weekly freeze | Done |
| Vibe status | Done |
| Block / report / restricted mode | Done |
| Smart caption chips (EN/FR/QC) | Done |
| Realtime (chat, inbox, groups) | Partial (Supabase Realtime) |
| PWA + Netlify + code-split | Done |

### Stack (locked unless we decide to change)

- **FE:** Vite + React + TS PWA (`frontend/`)
- **BE:** Supabase (Auth, Postgres, Storage, RLS, Realtime)
- **Deploy:** Netlify (`netlify.toml`)
- **i18n:** EN + FR dictionaries (`useSEO`-style patterns not required; app is private social)

### Design principles (do not break)

1. **Friends-first** by default; public is opt-in (Spotlight).  
2. **Consent** for map / location / alerts.  
3. **Bilingual** is a product feature, not an afterthought.  
4. **No fake Snapchat API** — we own our graph.  
5. **Anti-FOMO** where Snap is cruel (memories, streak freeze, restricted mode).  
6. **Ship slices** that are usable alone; avoid half-wired mega-features.

---

## 1. Strategy: “unique” bets (what we double down on)

| Bet | Why it differentiates |
|-----|------------------------|
| **Bilingual social OS** | Translate, dual captions, QC voice — Snap is US-first. |
| **Owned media + vault** | Memories you control; not only ephemeral theatre. |
| **Consent map** | Share location when *you* want — not always-on surveillance. |
| **Crew tools** | Groups, invite links, vibe status, freezes. |
| **Safety without nanny state** | Block, report, restricted mode — clear and local. |
| **Honest web product** | PWA first; no pretend “we have Snap’s AR empire.” |

**Out of scope forever (unless you reverse):** reverse-engineering Snapchat, Bitmoji clone, ads graph, dark-pattern engagement hacks.

---

## 2. Roadmap overview

```
NOW (v1.x polish)     →  NEAR (v1.5 depth)  →  MID (v2 platform)  →  LATER (v3 scale)
─────────────────────────────────────────────────────────────────────────────────
Stability · UX · a11y    AI captions · parental    Custom domain · multi-device
Perf · QA · analytics    Hive codes · multi-lang   Native shells · moderation
Moderation queue lite    Ephemeral polish · push   Creator economy (optional)
```

---

## 3. Phase A — Stabilize & polish (1–3 weeks, low risk)

**Goal:** App feels reliable for a 10–50 person crew daily.

### A1. Quality & correctness

| Task | Detail | Success |
|------|--------|---------|
| A1.1 End-to-end checklist | Auth → friend → snap → react → chat → story → spotlight → group | Doc + run on 2 phones |
| A1.2 RLS audit | Every table: stranger / friend / blocked | SQL tests or manual matrix |
| A1.3 Storage policies | Stickers, memories, group audio, stories, spotlight | No 403 for allowed users |
| A1.4 Ephemeral purge | Ghost notes always vanish after read; cron optional | No stale rows visible |
| A1.5 Error UX | Map every toast to FR+EN; never raw Postgres errors | User-facing strings only |
| A1.6 Empty / offline | Offline banner; retry buttons | Airplane mode survivable |

### A2. Performance & install

| Task | Detail | Success |
|------|--------|---------|
| A2.1 Bundle further | Split AuthContext/supabase if still heavy | Lighthouse mobile > target you set |
| A2.2 Image pipeline | Consistent compress + max dimensions | Uploads < ~1–2 MB typical |
| A2.3 PWA install | Better icons, splash, `display-standalone` polish | “Add to Home Screen” works iOS/Android |
| A2.4 Service worker | Cache shell only; never cache private media | No stale auth / media leaks |

### A3. Observability (lightweight)

| Task | Detail | Success |
|------|--------|---------|
| A3.1 Sentry (optional) | FE errors only first | Crash visibility |
| A3.2 Simple analytics | Privacy-friendly: page views, send success (no stalky heatmaps) | Funnel: signup → first snap |
| A3.3 Admin SQL views | Reports queue, abuse rates | You can moderate weekly |

### A4. Design polish

| Task | Detail | Success |
|------|--------|---------|
| A4.1 Design tokens | Document Sunny Pop colors/spacing | One source of truth |
| A4.2 Nav IA | 6–7 tabs is tight — consider “More” sheet | No accidental taps |
| A4.3 Onboarding | 3 screens: vibe of product, add friend, first snap | First session < 2 min |
| A4.4 Accessibility | Focus rings, 44px targets, contrast | Basic axe audit clean |

**Exit criteria Phase A:** You + 5 friends use it a week without “it’s broken” reports.

---

## 4. Phase B — Depth features (3–8 weeks)

**Goal:** Features that feel *clearly better / different* than Snap for our niche.

### B1. Bilingual superpowers

| Task | Detail | Success |
|------|--------|---------|
| B1.1 Dual-caption snaps | Optional second language caption field | FR + EN on one snap |
| B1.2 Translate stories / spotlight | Same EN⇄FR control as chat | One tap |
| B1.3 Real AI captions (optional) | SpaceXAI / gateway — joual-aware prompts | Toggle “AI caption” |
| B1.4 Locale-aware onboarding | Force language pick once | Fewer mixed UI bugs |
| B1.5 Search users FR accents | Normalize é/e in username search | `andre` finds `andré` if allowed |

### B2. Media & creation

| Task | Detail | Success |
|------|--------|---------|
| B2.1 Text on photo | Free-position text layers in editor | Like Snap text tool lite |
| B2.2 Sticker packs | Official “ChatSnap QC pack” + user packs | Share pack later |
| B2.3 Video trim | Cap length + simple trim UI | Fewer upload fails |
| B2.4 Reply-to-snap | From viewer → chat with context chip | Thread continuity |
| B2.5 Multi-snap story | Already multi-item; polish progress UX | Feels intentional |

### B3. Social graph & discovery

| Task | Detail | Success |
|------|--------|---------|
| B3.1 **Hive invite codes** | Create private hive / school / friends-only join code | Growth without open spam |
| B3.2 Mutual friends / suggestions | Soft suggestions from group co-membership | Not creepy ads |
| B3.3 Spotlight ranking | Chronological + light “friends of friends” boost | Not engagement crack |
| B3.4 Hashtags (optional) | Soft tags on Spotlight only | Searchable later |

### B4. Safety & trust

| Task | Detail | Success |
|------|--------|---------|
| B4.1 Moderation dashboard | Private `/admin` for reports (you only) | Action block/delete |
| B4.2 Rate limits | Snaps / friend requests / messages / reports | Abuse-resistant |
| B4.3 Age gate | DOB or “13+” attestation + restricted default | Policy-ready |
| B4.4 Parental dashboard (v2 lite) | Link child account → activity summary | Optional product line |
| B4.5 Content filters | Client-side NSFW warn (best-effort web) | Honest limits labeled |

### B5. Communication

| Task | Detail | Success |
|------|--------|---------|
| B5.1 Read receipts toggle | Per-user privacy setting | Choice |
| B5.2 Typing indicators | Realtime presence | Feels live |
| B5.3 Message reply / react | Emoji on chat messages | Parity with snaps |
| B5.4 Group admin tools | Kick, rename, leave | Complete groups |
| B5.5 Web Push (real) | VAPID + SW + Supabase edge or Netlify fn | Notify when app closed |

### B6. Map 2.0

| Task | Detail | Success |
|------|--------|---------|
| B6.1 Ghost / timed share | Share location for 1h / until evening | Consent precision |
| B6.2 City-only mode | Coarse geohash, not exact pin | Safer default |
| B6.3 Meet-up stickers | Drop a “here” pin for friends 30 min | Useful not creepy |

**Exit criteria Phase B:** Distinct “ChatSnap only” habits (freeze, ghost notes, dual language, vault).

---

## 5. Phase C — Platform (2–4 months)

**Goal:** Operable product, not just a repo.

### C1. Domains & environments

| Task | Detail |
|------|--------|
| C1.1 Custom domain | `chatsnap.app` / `chatsnap.ca` + www |
| C1.2 Staging | Supabase branch or second project + Netlify preview |
| C1.3 Env hygiene | Rotate all leaked tokens (Netlify, Supabase PAT) — **do soon** |
| C1.4 Secrets policy | Never paste secrets in chat; `.local/` only |

### C2. Data & reliability

| Task | Detail |
|------|--------|
| C2.1 Cron jobs | Expire stories/spotlight, purge ephemeral, storage GC |
| C2.2 Backups | Supabase PITR / export schedule |
| C2.3 Migrations discipline | Only via `supabase/migrations` + `db push` |
| C2.4 Feature flags | Simple `app_config` table or Netlify env flags |

### C3. Multi-device / native

| Task | Detail |
|------|--------|
| C3.1 Capacitor or PWA+ | Optional native shell for camera reliability |
| C3.2 Shared deep links | Universal links for `/add/:user`, `/group/:id` |
| C3.3 Better camera on iOS | Prefer native capture path when shell exists |

### C4. Legal & brand

| Task | Detail |
|------|--------|
| C4.1 Terms / Privacy (FR+EN) | Real pages, not lorem |
| C4.2 Child safety policy | Reporting path, contact email |
| C4.3 Brand kit | Logo, wordmark, colors (no Snap ghost) |
| C4.4 Store listings (if native) | Screenshots, QC story |

**Exit criteria Phase C:** You could onboard 500 users without fear of total data loss or secret leaks.

---

## 6. Phase D — Optional scale / business (later)

Only if you *want* a company, not just a crew app.

| Idea | Notes |
|------|--------|
| Creator tips / Cennes-style | Only if you want money rails (Stripe) |
| Verified creators | Manual badge |
| Public API for bots | Dangerous; wait |
| Federated hives | Multiple communities, one app |
| Desktop web polish | Keyboard shortcuts, multi-column |

**YAGNI until Phase B exit is green.**

---

## 7. Technical debt backlog (track continuously)

| Debt | Why |
|------|-----|
| Polling still mixed with Realtime | Unify on Realtime + backoff |
| Nav overcrowding | Map/Discover/Chat — “More” menu |
| AuthContext chunk size | Split supabase client / hooks |
| No automated tests | Add vitest for pure libs first |
| Friendship delete/block edge cases | Matrix test |
| MyMemory translate limits | Replace with own model later |
| Leaflet CDN marker icons | Bundle local assets |
| Report queue has no UI for you | Phase B4.1 |

---

## 8. Suggested sequencing (no rush)

### Sprint 0 (this week) — hygiene
1. **Rotate secrets** (Supabase PAT, Netlify token, any pasted DB passwords).  
2. Run Phase A1 checklist on 2 devices.  
3. Fix any P0 bugs from that pass.  
4. Custom domain decision (optional).  

### Sprint 1 — reliability  
- A1 RLS + storage audit  
- A2 PWA icons / install  
- A4 onboarding 3 screens  

### Sprint 2 — bilingual depth  
- B1.1 dual captions  
- B1.2 translate on stories/spotlight  
- B5.5 research Web Push design (don’t implement half)  

### Sprint 3 — creation depth  
- B2.1 text tool  
- B2.4 reply-to-snap  
- B2.2 starter sticker pack (QC)  

### Sprint 4 — growth without spam  
- B3.1 hive invite codes  
- B4.2 rate limits  
- B4.1 reports admin page (you only)  

### Sprint 5 — live product feel  
- B5.2 typing indicators  
- B5.1 read receipt toggle  
- B5.4 group admin  

### Sprint 6+ — platform  
- C2 crons  
- C1 staging  
- C3 native shell **only if** camera still hurts on iOS Safari  

---

## 9. Decision log (open choices)

| Decision | Options | Recommendation |
|----------|---------|----------------|
| AI provider for captions | None (current) / SpaceXAI / other | Keep free suggestions until quality demand; then SpaceXAI |
| Push architecture | Netlify Functions + VAPID / Supabase Edge | Design first; implement after Phase A |
| Map precision | Exact pin / geohash city | Default **city or timed exact** |
| Public Spotlight | Keep open / friends-of-friends / hive-only | Start **open + report**; add hive-only flag later |
| Age policy | 13+ attestation / DOB | Attestation first, DOB if legal needs |
| Native | Stay PWA / Capacitor | PWA until pain is proven |

---

## 10. Metrics that matter (simple)

Track only what changes decisions:

| Metric | Why |
|--------|-----|
| D1: signup → username set | Funnel health |
| D1: first friend | Graph health |
| D7: returned to send snap | Core loop |
| % snaps with “save memory” | Vault value |
| EN⇄FR translate taps | Bilingual bet |
| Reports / week | Safety load |
| Restricted mode users | Parental/focus bet |
| PWA install rate | Mobile-native-ish reach |

Avoid vanity DAU theater until you have a real audience goal.

---

## 11. Roles (when it’s just you + Grok)

| You | Grok / agents |
|-----|----------------|
| Product taste, brand, final “ship?” | Implement slices, migrations, deploys |
| Supabase dashboard / legal | Code, SQL drafts, checklists |
| Recruit 5–20 testers | Fix bugs, write docs |
| Secret rotation | Never store secrets in git/chat again |

---

## 12. Definition of “better than Snap” for *us*

We win if a bilingual crew says:

> “We don’t need Snap for *us* — ChatSnap is where our people are, in our language, without the anxiety.”

Not if we have more AR lenses.

---

## 13. Immediate next action (when you resume building)

**Pick one Phase A track** (recommended order):

1. **Secret rotation + E2E checklist** (boring, critical)  
2. **Onboarding + nav “More” menu** (feel)  
3. **Hive invite codes** (growth that fits the product)  

Reply with `1`, `2`, or `3` (or another phase) when you want implementation to resume — no rush until then.

---

## Appendix A — Repo map (for implementers)

```
frontend/src/
  pages/     # screens
  components/# SnapEditor, StoriesRail, BottomChrome, Toast…
  lib/       # snaps, messages, stories, groups, memories, map, safety…
  locales/   # en.ts, fr.ts
  contexts/  # Auth
supabase/migrations/  # 0001…0009+
docs/superpowers/specs/  # design + this roadmap
netlify.toml
```

## Appendix B — Migration index

| # | Topic |
|---|--------|
| 0001 | Core profiles, friendships, snaps, storage |
| 0002 | Captions, streaks |
| 0003 | DM messages |
| 0004 | Stories + realtime pubs |
| 0005 | Spotlight + reactions |
| 0006 | Groups |
| 0007 | Memories, blocks, map |
| 0008 | Ghost notes, vibe, freeze |
| 0009 | Stickers, reports, restricted |

Future: `0010_hive_codes.sql`, `0011_push_subscriptions.sql`, `0012_dual_captions.sql`, etc.
