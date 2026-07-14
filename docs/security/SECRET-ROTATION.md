# ChatSnap — Secret rotation checklist

**Status:** In progress (2026-07-14)  
**Why:** Personal access tokens and a DB password were shared in chat during setup. Treat them as **compromised**.

Do this in order. Do **not** paste new secrets into chat or commit them to git.

---

## What was exposed (rotate these)

| Secret | Risk | Action |
|--------|------|--------|
| **Netlify PAT** (`nfp_…`) | Deploy / env control | **Revoke** + create new |
| **Supabase PAT** (`sbp_…`) | Project create / SQL / keys API | **Revoke** + create new |
| **DB password** (Postgres) | Full database access | **Reset** in dashboard |
| **Service role key** (if copied) | Bypass RLS | **Rotate** API keys if it left your machine insecurely |
| **Anon / publishable key** | Public by design (in browser) | Optional rotate; update Netlify + local `.env` |

---

## 1. Netlify personal access token

1. Open: https://app.netlify.com/user/applications#personal-access-tokens  
2. **Delete / revoke** any token used with ChatSnap or pasted in chat.  
3. **New access token** → copy once → store only in:
   - Password manager, or  
   - `C:\Users\north\chatsnap-new\.local\secrets.env` (gitignored)  
4. For CLI later:
   ```powershell
   $env:NETLIFY_AUTH_TOKEN = "your-new-token"
   ```

**Do not** put Netlify PAT in the frontend or git.

---

## 2. Supabase access token (account PAT)

1. Open: https://supabase.com/dashboard/account/tokens  
2. **Revoke** the old `sbp_…` token.  
3. Create a new token with minimum scopes you need.  
4. Store only in password manager / `.local/secrets.env`.

---

## 3. Database password (project `zzlaytfkqmbslcygnmrc`)

1. Open: https://supabase.com/dashboard/project/zzlaytfkqmbslcygnmrc/settings/database  
2. **Database password → Reset**.  
3. Save the new password in your password manager.  
4. Update local only if you use CLI/psql:
   ```text
   DATABASE_URL=postgresql://postgres:NEW_PASSWORD@db.zzlaytfkqmbslcygnmrc.supabase.co:5432/postgres
   ```
5. Re-link if needed:
   ```powershell
   cd C:\Users\north\chatsnap-new
   $env:SUPABASE_ACCESS_TOKEN = "new-sbp-token"
   $env:SUPABASE_DB_PASSWORD = "new-db-password"
   npx supabase link --project-ref zzlaytfkqmbslcygnmrc
   ```

---

## 4. Supabase API keys (project)

1. Open: https://supabase.com/dashboard/project/zzlaytfkqmbslcygnmrc/settings/api  
2. Note:
   - **Project URL** — public  
   - **anon / public** (or publishable) — goes in **frontend** + Netlify `VITE_*`  
   - **service_role** — **never** in Vite/Netlify public env  
3. If service_role was ever pasted or committed, use **Rotate** / generate new JWT keys if Supabase UI offers it, then update any server-only tools.  
4. Local app:
   ```powershell
   # frontend/.env  (gitignored)
   VITE_SUPABASE_URL=https://zzlaytfkqmbslcygnmrc.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_or_publishable_key
   ```
5. Netlify site env (https://app.netlify.com/projects/chatsnap-app/configuration/env):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   Then **trigger a new deploy** (build bakes `VITE_*` into the bundle).

```powershell
# After new Netlify PAT + updated env in UI, redeploy from clean machine:
cd C:\Users\north\chatsnap-new
$env:NETLIFY_AUTH_TOKEN = "new-netlify-token"
npx netlify-cli deploy --prod --build
```

---

## 5. Local cleanup (done / do again anytime)

| Path | Rule |
|------|------|
| `.local/` | Gitignored — secrets only |
| `frontend/.env` | Gitignored — anon key only |
| `frontend/.env.example` | Placeholders only (safe to commit) |
| Chat / Discord / email | Never paste secrets |

Repo now ignores `.local/`, `.env*`, `.netlify/`, `supabase/.temp/`.

---

## 6. Verify rotation

| Check | Expected |
|--------|----------|
| Old Netlify PAT | Fails auth |
| Old Supabase PAT | Fails Management API |
| Old DB password | Auth fails on pooler |
| Site loads | https://chatsnap-app.netlify.app login works |
| `git status` | No `.env` / `.local` secrets staged |
| `git log -p` / GitHub search | No `nfp_` / `sbp_` / service_role in history |

If secrets ever hit **git history**, rotation alone is not enough — scrub history or treat repo as leaked and rotate everything.

---

## 7. Agent / AI rules going forward

1. Never ask the user to paste PATs or DB passwords in chat.  
2. Prefer: “put it in `.local/secrets.env` and say **done**.”  
3. Anon key may appear in browser builds (normal). Service role must not.  
4. After any accidental paste: **revoke immediately**, don’t wait.

---

## Checklist (tick when done)

- [ ] Revoked old Netlify PAT  
- [ ] Created new Netlify PAT (password manager only)  
- [ ] Revoked old Supabase PAT  
- [ ] Created new Supabase PAT  
- [ ] Reset Supabase DB password  
- [ ] Updated `frontend/.env` with current anon key  
- [ ] Updated Netlify `VITE_SUPABASE_*` env  
- [ ] Redeployed production  
- [ ] Confirmed login + one snap on live site  
- [ ] Deleted secret files from Downloads / screenshots / notes if any  

When finished, reply **rotation done** (no secrets) and we can continue Phase A (E2E checklist) next.
