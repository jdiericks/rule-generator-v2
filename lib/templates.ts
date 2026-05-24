import { RuleTemplate } from './types'

export const TEMPLATES: RuleTemplate[] = [
  {
    id: 'nextjs-typescript',
    name: 'Next.js + TypeScript',
    description: 'App Router with TypeScript, Tailwind, and shadcn/ui — the full modern stack',
    category: 'frontend',
    techTags: ['Next.js', 'TypeScript', 'Tailwind CSS', 'React', 'shadcn/ui'],
    sections: [
      {
        name: 'TypeScript Standards',
        type: 'code-style',
        globs: '**/*.{ts,tsx}',
        alwaysApply: true,
        description: 'Type safety and code quality rules',
        requirements:
          '- Named exports only — no default exports except page.tsx, layout.tsx, error.tsx\n' +
          '- Always type function parameters and return values explicitly\n' +
          '- No `any` types — use `unknown` and narrow with type guards\n' +
          '- Use Zod for all runtime input validation\n' +
          '- Prefer `type` over `interface` for object shapes\n' +
          '- Use `const` assertions (`as const`) on static data\n' +
          '- Avoid non-null assertion (`!`) — handle nullability explicitly\n' +
          '- Use discriminated unions for state modeling',
        order: 0,
      },
      {
        name: 'App Router Structure',
        type: 'file-structure',
        globs: '',
        alwaysApply: true,
        description: 'Next.js App Router folder and file conventions',
        requirements:
          '- /app — routes only (page.tsx, layout.tsx, error.tsx, loading.tsx)\n' +
          '- /components — shared UI, organized by feature or domain\n' +
          '- /lib — utilities, helpers, and third-party client singletons\n' +
          '- /lib/actions.ts — all server actions\n' +
          '- /lib/db.ts — database client singleton\n' +
          '- /types — shared TypeScript type definitions\n' +
          '- /hooks — custom React hooks\n' +
          '- Co-locate page-specific components inside the route folder\n' +
          '- Keep component files under 200 lines — extract sub-components early',
        order: 1,
      },
      {
        name: 'React Component Patterns',
        type: 'components',
        globs: '**/*.tsx',
        alwaysApply: false,
        description: 'Server/client component patterns and API conventions',
        requirements:
          '- Server components by default — add "use client" only when strictly needed\n' +
          '- Use shadcn/ui as the base component library\n' +
          '- Every component must have an explicitly typed Props interface\n' +
          '- Tailwind CSS only — no inline styles, no CSS modules\n' +
          '- Extract complex logic into named custom hooks in /hooks\n' +
          '- Handle loading, error, and empty states in every async component\n' +
          '- Use Next.js Image for all images, never bare <img>',
        order: 2,
      },
      {
        name: 'Server Actions & Data',
        type: 'architecture',
        globs: '**/*.{ts,tsx}',
        alwaysApply: false,
        description: 'Data fetching and mutation patterns',
        requirements:
          '- Server actions for all mutations (create, update, delete)\n' +
          '- Validate all server action inputs with Zod before processing\n' +
          '- Return typed ActionResult: { success: true, data } | { success: false, error }\n' +
          '- Never expose raw database errors to the client\n' +
          '- Revalidate the relevant path after mutations with revalidatePath()\n' +
          '- Fetch data in Server Components where possible\n' +
          '- Use React Query only for data needing real-time updates or complex caching',
        order: 3,
      },
    ],
  },
  {
    id: 'fastapi-python',
    name: 'FastAPI + Python',
    description: 'Async FastAPI with SQLModel, typed endpoints, and clean architecture',
    category: 'backend',
    techTags: ['FastAPI', 'Python', 'SQLModel', 'PostgreSQL'],
    sections: [
      {
        name: 'Python Code Style',
        type: 'code-style',
        globs: '**/*.py',
        alwaysApply: true,
        description: 'Python quality, types, and formatting',
        requirements:
          '- Type hints required on all function signatures\n' +
          '- Pydantic/SQLModel models for all request and response shapes\n' +
          '- Async functions for all route handlers and DB operations\n' +
          '- No bare `except:` — always catch specific exception types\n' +
          '- Use pathlib.Path over os.path\n' +
          '- Docstrings on all public functions and classes\n' +
          '- Ruff for linting and formatting — follow PEP 8\n' +
          '- Avoid mutable default arguments in function signatures',
        order: 0,
      },
      {
        name: 'FastAPI Patterns',
        type: 'architecture',
        globs: '**/*.py',
        alwaysApply: true,
        description: 'Routing, dependency injection, and response modeling',
        requirements:
          '- Organize routes into domain-specific routers in /routers\n' +
          '- Use dependency injection for DB sessions, auth, and services\n' +
          '- All endpoints must have `response_model` defined\n' +
          '- Use correct HTTP status codes: 201 creates, 204 deletes, 409 conflicts\n' +
          '- Raise `HTTPException` with clear detail messages for client errors\n' +
          '- Use lifespan context manager for startup/shutdown\n' +
          '- Prefix all routers with /api\n' +
          '- CORS middleware configured from environment variables',
        order: 1,
      },
      {
        name: 'SQLModel & Database',
        type: 'database',
        globs: '**/*.py',
        alwaysApply: false,
        description: 'Database access patterns with SQLModel',
        requirements:
          '- SQLModel for all database models and queries\n' +
          '- Separate table models from schema models (Read/Create/Update variants)\n' +
          '- Always use DI for sessions — never create sessions in route handlers directly\n' +
          '- Use `select()` statements — document any raw SQL with a comment\n' +
          '- Handle `IntegrityError` explicitly for unique constraint violations\n' +
          '- All schema changes through Alembic migrations',
        order: 2,
      },
    ],
  },
  {
    id: 'saas-fullstack',
    name: 'SaaS Fullstack',
    description: 'Next.js + FastAPI + Stripe — complete SaaS product conventions',
    category: 'fullstack',
    techTags: ['Next.js', 'FastAPI', 'TypeScript', 'Python', 'Stripe', 'PostgreSQL'],
    sections: [
      {
        name: 'Auth & Sessions',
        type: 'auth',
        globs: '',
        alwaysApply: true,
        description: 'Auth flow, JWT sessions, and protected routes',
        requirements:
          '- JWT tokens stored in httpOnly cookies — never in localStorage\n' +
          '- Always validate session server-side before returning protected data\n' +
          '- Use a `get_current_user` dependency on all protected endpoints\n' +
          '- Never expose raw auth tokens or secrets to the client\n' +
          '- Redirect to /login on 401 — handle globally in the API client\n' +
          '- Include user_id in all DB queries for multi-tenant isolation',
        order: 0,
      },
      {
        name: 'API Client Patterns',
        type: 'mcp-api',
        globs: '**/*.{ts,tsx}',
        alwaysApply: false,
        description: 'Frontend API client and server state',
        requirements:
          '- All API calls through a centralized api/client.ts with axios\n' +
          '- Attach auth token via request interceptor\n' +
          '- Handle 401 globally — redirect to login, clear stored token\n' +
          '- React Query (TanStack Query) for all server state\n' +
          '- Define query keys as constants — never inline strings\n' +
          '- Handle loading, error, and empty states for every query\n' +
          '- Optimistic updates for fast-feeling mutations',
        order: 1,
      },
      {
        name: 'Stripe Integration',
        type: 'mcp-api',
        globs: '**/*.{ts,py}',
        alwaysApply: false,
        description: 'Stripe payments and webhook handling',
        requirements:
          '- Always verify webhook signatures — never trust payload without verification\n' +
          '- Handle idempotency — webhooks can fire multiple times\n' +
          '- Store Stripe customer_id and subscription_id on the user record\n' +
          '- Use metadata to link Stripe objects back to internal IDs\n' +
          '- Never expose Stripe secret key to the frontend\n' +
          '- Test all webhook events with Stripe CLI before deploying',
        order: 2,
      },
    ],
  },
  {
    id: 'mcp-server-ts',
    name: 'MCP Server (TypeScript)',
    description: 'Model Context Protocol server with typed tools and Zod validation',
    category: 'mcp',
    techTags: ['MCP', 'TypeScript', 'Node.js', 'Claude API'],
    sections: [
      {
        name: 'MCP Tool Definitions',
        type: 'mcp-api',
        globs: '**/*.ts',
        alwaysApply: true,
        description: 'How to define, implement, and document MCP tools',
        requirements:
          '- Tool names in snake_case — descriptive and action-oriented (get_customer_by_id)\n' +
          '- All tool inputs validated with Zod schema before touching business logic\n' +
          '- Return structured JSON objects, never plain text strings\n' +
          '- Return { success: false, error: string } on failure — never throw from tools\n' +
          '- Document every tool: what it does, inputs, outputs, and edge cases\n' +
          '- Group related tools by domain: crm.ts, invoicing.ts, etc.\n' +
          '- Use pagination for tools that may return large datasets',
        order: 0,
      },
      {
        name: 'MCP Response Handling',
        type: 'architecture',
        globs: '**/*.ts',
        alwaysApply: true,
        description: 'How consumers process MCP response blocks',
        requirements:
          '- Extract response blocks by `type` field — never by position in the array\n' +
          '- Filter for `mcp_tool_result` blocks to get actual data\n' +
          '- Always attempt JSON.parse on result content before using\n' +
          '- Handle cases where tool results may be empty or null\n' +
          '- Combine tool results from sequential calls when building context\n' +
          '- Log tool call failures without exposing sensitive data',
        order: 1,
      },
    ],
  },
  {
    id: 'testing-standards',
    name: 'Testing Standards',
    description: 'Vitest + React Testing Library + Playwright e2e conventions',
    category: 'testing',
    techTags: ['Vitest', 'Playwright', 'React Testing Library'],
    sections: [
      {
        name: 'Unit & Integration Tests',
        type: 'testing',
        globs: '**/*.{test,spec}.{ts,tsx}',
        alwaysApply: false,
        description: 'Test structure, patterns, and coverage expectations',
        requirements:
          '- Test files live alongside the module they test (not in a separate /tests folder)\n' +
          '- Follow Arrange-Act-Assert in every test\n' +
          '- Mock all external dependencies — API calls, DB, third-party services\n' +
          '- Test edge cases and error paths, not just the happy path\n' +
          '- Descriptive names: "should [expected behavior] when [condition]"\n' +
          '- 80%+ coverage required for business logic and utility functions',
        order: 0,
      },
      {
        name: 'E2E Tests (Playwright)',
        type: 'testing',
        globs: 'e2e/**/*.ts',
        alwaysApply: false,
        description: 'End-to-end test conventions',
        requirements:
          '- E2E tests in /e2e at the project root\n' +
          '- Use Page Object Model for complex page interactions\n' +
          '- Test critical user journeys: auth, primary CRUD flows, payments\n' +
          '- Use test fixtures for repeated setup (authenticated user, test data)\n' +
          '- Assertions on visible UI state — never on internal implementation details\n' +
          '- Run against a real test database with seeded data',
        order: 1,
      },
    ],
  },
  {
    id: 'git-cicd',
    name: 'Git & CI/CD',
    description: 'Commit conventions, branch strategy, and GitHub Actions standards',
    category: 'devops',
    techTags: ['Git', 'GitHub Actions'],
    sections: [
      {
        name: 'Git Workflow',
        type: 'git',
        globs: '',
        alwaysApply: true,
        description: 'Branch strategy, commits, and PR process',
        requirements:
          '- Conventional commits: feat/fix/chore/docs/refactor/test/perf\n' +
          '- Scope in parens when helpful: feat(auth): add OAuth\n' +
          '- No direct commits to main or develop — always PR\n' +
          '- PR description must explain what and why, link to issue\n' +
          '- Squash merge only — keep main history linear\n' +
          '- Delete branches after merge\n' +
          '- Tag releases with semantic versioning: v1.2.3',
        order: 0,
      },
      {
        name: 'CI Pipeline',
        type: 'architecture',
        globs: '.github/**',
        alwaysApply: false,
        description: 'GitHub Actions CI standards',
        requirements:
          '- Run lint, type-check, and tests on every PR\n' +
          '- Fail fast — lint before tests\n' +
          '- Cache node_modules and pip installs between runs\n' +
          '- Never hard-code secrets — use GitHub Secrets\n' +
          '- Preview deployments on PRs\n' +
          '- Deploy to production only from main on successful CI',
        order: 1,
      },
    ],
  },
  {
    id: 'react-component-lib',
    name: 'React Component Library',
    description: 'Standalone component library with Storybook and design tokens',
    category: 'frontend',
    techTags: ['React', 'TypeScript', 'Vite', 'Storybook'],
    sections: [
      {
        name: 'Component API Design',
        type: 'components',
        globs: '**/*.tsx',
        alwaysApply: true,
        description: 'Consistent, reusable component API conventions',
        requirements:
          '- Every component exported with a named export from its index.ts\n' +
          '- Props interface named [ComponentName]Props and exported\n' +
          '- Polymorphic `as` prop for semantic HTML flexibility on base elements\n' +
          '- Support `className` and `style` on all public components\n' +
          '- Forward refs on all leaf DOM components\n' +
          '- Prefer controlled over uncontrolled components\n' +
          '- Include aria attributes — accessible out of the box\n' +
          '- Every component has a Storybook story covering all meaningful variants',
        order: 0,
      },
    ],
  },
]

export const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full Stack',
  testing: 'Testing',
  devops: 'DevOps',
  mcp: 'MCP / AI',
}
