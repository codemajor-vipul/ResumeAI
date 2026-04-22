# ResumeAI.React — E2E Test Client

## Purpose
A React + TypeScript single-page app that exercises every API endpoint in the ResumeAI system through a real UI. Designed for E2E testing and demos, **not** production UI. Every interaction shows request/response data clearly so you can see exactly what the APIs are doing.

## Tech Stack
| Tool | Version | Why |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Catches API contract drift at compile time |
| Vite | 5 | Fast dev server with proxy config (no CORS pain) |
| React Router | 6 | Client-side routing |
| Axios | 1.7 | HTTP client with interceptors for JWT attachment |

**No Tailwind / no component library** — intentional. Inline styles keep the bundle tiny and dependencies minimal for a test client.

## Pages & What They Test

| Page | Route | Services Tested |
|---|---|---|
| Auth | `/auth` | Auth: register, login, Google OAuth, LinkedIn OAuth |
| Dashboard | `/` | Auth: profile, AI: quota + history, Notifications: unread count |
| Templates | `/templates` | Template: getAll, getFree, getPopular, getById |
| Resume Flow | `/resume` | Resume: CRUD · Section: add/list/delete/reorder · AI: summary/ATS/skills · Export: PDF/DOCX/status |
| Job Match | `/jobmatch` | JobMatch: analyze, list, top, bookmark |
| Notifications | `/notifications` | Notifications: list, unread count, mark read, mark all, delete |

## Full E2E Happy Path
```
1. /auth          → Register a new account (or login)
2. /templates     → Browse templates, note a templateId
3. /resume (Step 1) → Create a resume using that templateId
4. /resume (Step 2) → Add sections (SUMMARY, EXPERIENCE, SKILLS)
5. /resume (Step 3) → Generate AI summary → copy output → paste into section
6. /resume (Step 3) → Run ATS check → see score
7. /resume (Step 4) → Export PDF → poll status
8. /jobmatch      → Paste job description → analyze fit
9. /notifications → See EXPORT_READY + ATS_COMPLETE notifications arrive
```

## Running Locally

### Prerequisites
- Node.js 18+
- All backend services running (e.g. via `docker compose up -d` from the repo root)

```bash
cd src/ResumeAI.React
npm install
npm run dev
# Opens at http://localhost:3000
```

The Vite dev server proxies `/api/*` → `http://localhost:5000` (the YARP gateway) so no CORS config is needed.

## Running via Docker Compose
The React app is included in `docker-compose.yml` as the `web` service. It's built into a static bundle served by Nginx on port 3000.

```bash
docker compose up -d
# React app: http://localhost:3000
# Gateway:   http://localhost:5000
```

## Architecture Notes
- **All API calls go through the gateway** (`/api/*`) — never directly to individual services. This mirrors production topology.
- **JWT stored in `localStorage`** — fine for a test client. In production, use `httpOnly` cookies.
- **`AuthContext`** manages login state globally. The `PrivateRoute` wrapper redirects to `/auth` if no token exists.
- **`api/index.ts`** is the single place where service URLs and shapes are defined — if an endpoint changes, you fix it in one place.
