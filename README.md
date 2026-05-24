# Cursor Rules Builder

A multi-tenant app for building, managing, and generating Cursor AI rule files
(`.mdc`) — with login, per-account project storage, and one-click commits into
your GitHub repositories.

**Stack:** Next.js 14 · TypeScript · NextAuth (GitHub) · Drizzle ORM · Neon
Postgres · Anthropic Claude · Octokit · Deployed on Vercel

## Features

- **Sign in with GitHub** — each user gets a private workspace
- **Per-account storage** — projects, sections, and the Anthropic API key are
  scoped to your account in Postgres
- **Encrypted Anthropic key at rest** — AES-256-GCM, never exposed to the client
- **Section builder** — 10 rule types with guided placeholders
- **Templates** — 7 built-in starter rule sets (Next.js, FastAPI, MCP, …)
- **Write rules yourself** — every section has an editable `.mdc` content
  textarea; you can ship a project end-to-end without ever touching AI
- **Optional AI assist (Claude)** — when an Anthropic key is configured, each
  section gains "Draft with AI" (write a starter `.mdc` from your notes) and
  "Expand with AI" (expound on the content you've already written)
- **Download** — individual `.mdc` files or a `.zip` of the full
  `.cursor/rules/` folder
- **Push to GitHub** — link any repo and commit generated rules directly into
  `.cursor/rules/` on a branch of your choice

---

## Required services

Spin up these three before running locally or deploying:

1. **Neon Postgres** — create a database at
   [console.neon.tech](https://console.neon.tech/) and copy the pooled
   connection string.
2. **GitHub OAuth App** — register at
   [github.com/settings/developers](https://github.com/settings/developers).
   - Homepage URL: your deployed URL (or `http://localhost:3000`)
   - Authorization callback URL:
     `{NEXTAUTH_URL}/api/auth/callback/github`
   - The app requests the `repo` scope so users can push to private repos.
3. **Anthropic API key** — each user adds their own from the in-app Settings
   panel (no shared key required for deploy).

---

## Local development

```bash
npm install
cp .env.example .env.local         # then fill in values
npm run db:migrate                 # apply the schema to your Neon database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

### Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL (omit on Vercel where it's auto-detected) |
| `GITHUB_ID` / `GITHUB_SECRET` | OAuth app credentials |
| `SECRET_KEY` | 32-byte hex (`openssl rand -hex 32`) — encrypts stored Anthropic keys |

---

## Deploy to Vercel

1. Push to a GitHub repo and import it at
   [vercel.com/new](https://vercel.com/new).
2. Add a Neon Postgres integration (or paste `DATABASE_URL` manually).
3. Add the rest of the env vars from `.env.example`.
4. Set the GitHub OAuth app's callback URL to
   `https://<your-vercel-url>/api/auth/callback/github`.
5. Run migrations against the production database one time:
   `DATABASE_URL=… npm run db:migrate`
6. Deploy. Every user signs in with their own GitHub account; their projects,
   API key, and repo links stay isolated.

---

## Architecture

| Concern | Where it lives |
| --- | --- |
| Auth | `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts` (NextAuth + GitHub) |
| DB schema | `lib/db/schema.ts` (Drizzle, Postgres) |
| Migrations | `drizzle/` (generated via `npm run db:generate`) |
| Encryption | `lib/crypto.ts` (AES-256-GCM with `SECRET_KEY`) |
| Project / section CRUD | `app/api/projects/...` (auth-gated, owner-scoped) |
| Generation | `app/api/generate/route.ts` (uses each user's stored Anthropic key) |
| GitHub | `app/api/github/*` and `app/api/projects/[id]/github/*` (Octokit) |
| Client storage shim | `lib/storage.ts` (thin async fetch wrappers — components stay simple) |

The `app/api/projects/[id]/github/push` route uses the GitHub Git Data API to
write all generated `.mdc` files as a single atomic commit on the linked
branch. If the branch doesn't yet exist it is created from the repo's default
branch.

---

## Adding templates

Edit `lib/templates.ts` — add an entry to the `TEMPLATES` array. The structure
is unchanged from the original storage-only version of the app.

---

## Where generated files go

Generated files are committed (or downloaded) into `.cursor/rules/` at the root
of the linked repo. Cursor picks them up automatically. The path is
configurable per-project in the GitHub tab.
