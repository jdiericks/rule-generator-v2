# Cursor Rules Builder

A frontend-only app for building, managing, and generating Cursor AI rule files (`.mdc`).

**Stack:** Next.js 14 · TypeScript · Deployed on Vercel

No database, no auth, no backend services. Everything persists in your browser's localStorage. The only server-side piece is a single Next.js API route that proxies Claude generation calls.

## Features

- **Project management** — create and organize rule projects in localStorage
- **Section builder** — 10 rule types with placeholder guidance for each
- **7 built-in templates** — Next.js, FastAPI, SaaS Fullstack, MCP Server, Testing, Git/CI, and more
- **Claude-powered generation** — your Anthropic API key generates detailed MDC files
- **Per-section regeneration** — regenerate individual sections without losing others
- **Download** — individual `.mdc` files or a full `.zip` ready to drop in `.cursor/rules/`

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — add your Anthropic API key in Settings.

No environment variables needed for local development.

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B — GitHub + Vercel dashboard

1. Push to a GitHub repo
2. Import the repo at vercel.com/new
3. Deploy — no environment variables needed (API key is entered by each user in the UI)

That's it.

---

## How it works

**Data storage:** All projects and sections are stored in `localStorage` under the key `crb_projects`. Your Anthropic API key is stored under `crb_api_key`.

**Generation:** When you click Generate, the browser sends a request to `/api/generate` (a Next.js API route). That route uses the Anthropic SDK server-side and returns the generated MDC content. The API key is sent as an `x-api-key` header.

**Files:** Generated content is previewed in-app, stored back to localStorage, and can be downloaded as individual `.mdc` files or a `.zip` containing the full `.cursor/rules/` folder structure.

---

## Adding templates

Edit `lib/templates.ts` — add a new entry to the `TEMPLATES` array. The structure is:

```ts
{
  id: 'unique-id',
  name: 'Template Name',
  description: 'What it covers',
  category: 'frontend',  // frontend | backend | fullstack | testing | devops | mcp
  techTags: ['Next.js', 'TypeScript'],
  sections: [
    {
      name: 'Section Name',
      type: 'code-style',
      globs: '**/*.{ts,tsx}',
      alwaysApply: true,
      description: 'What this section enforces',
      requirements: '- Rule one\n- Rule two',
      order: 0,
    },
  ],
}
```

---

## Where generated files go

Drop the downloaded files into `.cursor/rules/` at the root of your project. Cursor picks them up automatically. You can also set `alwaysApply: true` to have a rule file attach to every chat session, or use `globs` to limit it to specific file types.
