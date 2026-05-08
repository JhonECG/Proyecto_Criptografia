# Kript — Product Requirements (PRD)

## Original problem statement
> "Hi, these is a project i want to do at front, there are the colors palette and the logo, bur the logo i can put by myself, please can you do the front with the pdf detiles?"

User attached `main.pdf` (academic report for **Kript**, a zero-knowledge password manager) and `image.png` (color palette + logo mockup).

## User choices (confirmed via ask_human)
- Scope: landing page **+** functional application (login + dashboard + credential manager + generator)
- Cryptography: **not implemented yet** — UI/flow with plaintext storage on the backend for now (deferred)
- Language: **Spanish** throughout
- Logo: placeholder "KRIPT" wordmark (user will supply the official asset later)
- Palette (from user image): dark navy `#0a1118` / `#0f1b2d`, lime green `#c6e08a`, sky blue `#a8c6e0`

## Personas
- **End user**: anyone wanting an academic-grade, zero-knowledge password manager demo in Spanish.
- **Course evaluator / author team**: Jazmin Soto Quiñonez, Jhon Chilo Gonzales, Ariana Mercado Barbieri.

## Architecture (current iteration)
- FastAPI + MongoDB (Motor async), all routes under `/api`
- JWT access (12h) + refresh (7d) tokens as httpOnly cookies (SameSite=None, Secure) + Bearer fallback
- bcrypt for the master password (user account)
- UUID string ids throughout (no ObjectId leakage; `_id` always excluded)
- React 19 + CRA + Tailwind + shadcn primitives, sonner toasts, lucide icons
- Fonts: Orbitron (logo/display), Outfit (headings), IBM Plex Sans (body), IBM Plex Mono (passwords)

## What's implemented (Dec 2025 / May 2026)
- **Backend** (`/app/backend/server.py`)
  - `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/refresh`
  - `GET/POST /api/credentials`, `PUT/DELETE /api/credentials/{id}` (user-scoped)
  - `POST /api/generator` — CSPRNG via `secrets`, configurable charsets and length 4–128
  - Admin seed (`admin@kript.app` / `admin123`) on startup with idempotent password sync
  - CORS locked to `FRONTEND_URL` with credentials
- **Frontend**
  - Landing page in Spanish — hero, funciones, arquitectura (client/server split), criptografía (Argon2id/AES-256-GCM/CSPRNG), autores, CTA, footer
  - `/login` and `/register` (master password UX, "unrecoverable" warning + ack checkbox on register)
  - Protected `/app` shell with sidebar: Bóveda, Generador, Ajustes
  - Vault page: list, search (name/username/url), favoritos filter, reveal-in-place, copy buttons, row actions
  - Credential modal: create/edit/delete with inline password generator, favorite toggle, category select
  - Standalone generator with strength meter + bits estimate
  - Settings showing current session user
- **Testing**: 15/15 backend pytest + 10/10 frontend Playwright — all green

## Prioritized backlog
### P0 — next iteration
- [ ] **Client-side cryptography**: Argon2id KDF (argon2-browser) + AES-256-GCM via WebCrypto for true zero-knowledge (blobs only)
- [ ] Encrypted export (JSON with MAC) + encrypted import with validation

### P1
- [ ] Auto-lock on inactivity (timer + re-auth modal)
- [ ] Real shadcn `<Select>` for the category field in `CredentialModal`
- [ ] Login rate-limit + lockout (5 attempts / 15 min)
- [ ] Password reset flow (or explicit "no recovery" acknowledgment screen)

### P2
- [ ] Dashboard insights: weak/reused password detection
- [ ] Sync status indicator + server health badge
- [ ] Mobile responsive dashboard refinements
- [ ] Internationalization scaffolding (es → en)

## Next actions
1. Implement P0 client-side crypto to deliver on the "zero-knowledge" promise
2. Swap native select for shadcn Select (trivial polish)
3. Remove unused `CORS_ORIGINS="*"` entry from `backend/.env`
