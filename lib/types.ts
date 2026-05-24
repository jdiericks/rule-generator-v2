export interface RuleSection {
  id: string
  name: string
  type: SectionType
  globs: string
  alwaysApply: boolean
  description: string
  requirements: string
  generatedContent: string
  filename: string
  order: number
}

export interface Project {
  id: string
  name: string
  description: string
  techStack: string[]
  sections: RuleSection[]
  createdAt: string
  updatedAt: string
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  techTags: string[]
  sections: Omit<RuleSection, 'id' | 'generatedContent' | 'filename'>[]
  // 'system' = built-in (read-only) · 'user' = saved by the current account
  source?: 'system' | 'user'
  createdAt?: string
  updatedAt?: string
}

export type SectionType =
  | 'code-style'
  | 'file-structure'
  | 'mcp-api'
  | 'components'
  | 'testing'
  | 'git'
  | 'database'
  | 'auth'
  | 'architecture'
  | 'custom'

export type TemplateCategory = 'frontend' | 'backend' | 'fullstack' | 'testing' | 'devops' | 'mcp'

export interface SectionTypeMeta {
  value: SectionType
  label: string
  globs: string
  alwaysApply: boolean
}

export const SECTION_TYPE_META: SectionTypeMeta[] = [
  { value: 'code-style',     label: 'Code Style',      globs: '**/*.{ts,tsx,js,jsx}',       alwaysApply: true  },
  { value: 'file-structure', label: 'File Structure',   globs: '',                            alwaysApply: true  },
  { value: 'mcp-api',        label: 'MCP / API',        globs: '**/*.{ts,js}',               alwaysApply: false },
  { value: 'components',     label: 'Components',       globs: '**/*.{tsx,jsx}',             alwaysApply: false },
  { value: 'testing',        label: 'Testing',          globs: '**/*.{test,spec}.{ts,tsx}',  alwaysApply: false },
  { value: 'git',            label: 'Git & Commits',    globs: '',                            alwaysApply: true  },
  { value: 'database',       label: 'Database & ORM',   globs: '**/*.ts',                    alwaysApply: false },
  { value: 'auth',           label: 'Auth & Security',  globs: '',                            alwaysApply: false },
  { value: 'architecture',   label: 'Architecture',     globs: '',                            alwaysApply: true  },
  { value: 'custom',         label: 'Custom Rules',     globs: '',                            alwaysApply: false },
]

export const SECTION_PLACEHOLDERS: Record<SectionType, string> = {
  'code-style':     '- Named exports only, no default exports\n- Always type function params and return values\n- Use Zod for all input validation\n- No `any` types — use `unknown` with type guards\n- Prefer const over let',
  'file-structure': '- Feature-based folder structure\n- Co-locate tests with components\n- All API routes in /app/api\n- Shared utilities in /lib\n- Types in /types',
  'mcp-api':        '- Check tool availability before calling\n- Extract data blocks by type field, not position\n- Handle mcp_tool_result blocks explicitly\n- Always wrap tool calls in try/catch\n- Return structured errors, never raw throws',
  'components':     '- Server components by default — add "use client" only when needed\n- All components have a typed Props interface\n- shadcn/ui as the base component library\n- Tailwind for all styling — no inline styles\n- Handle loading, error, and empty states',
  'testing':        '- Test files live alongside the module they test\n- Arrange-Act-Assert structure in every test\n- Mock all external dependencies\n- Cover edge cases and error paths, not just the happy path\n- 80%+ coverage for business logic',
  'git':            '- Conventional commits: feat/fix/chore/docs/refactor\n- No direct commits to main\n- Squash merge only — keep history linear\n- Delete branches after merge\n- Tag releases with semver',
  'database':       '- ORM for all queries — document any raw SQL with a comment explaining why\n- All schema changes via migrations\n- Never expose DB client to client-side code\n- Handle IntegrityError explicitly for unique constraint violations',
  'auth':           '- Validate session server-side on every protected route\n- Never expose tokens to client JS\n- Row-level security for multi-tenant data\n- Explicit role checks — deny by default',
  'architecture':   '- Keep business logic out of UI components\n- Server actions for all mutations\n- Centralize error handling at route boundaries\n- Avoid prop drilling deeper than 2 levels',
  'custom':         'Describe any custom rules, conventions, or instructions you want Cursor to follow...',
}

export const TECH_OPTIONS = [
  'Next.js', 'React', 'TypeScript', 'JavaScript', 'Node.js',
  'Tailwind CSS', 'shadcn/ui', 'Vite', 'Zod', 'Zustand', 'React Query',
  'Drizzle ORM', 'Prisma', 'PostgreSQL', 'SQLite', 'Neon', 'Supabase',
  'FastAPI', 'Python', 'SQLModel', 'Vercel', 'Railway',
  'Stripe', 'Resend', 'tRPC', 'Claude API', 'MCP',
]
