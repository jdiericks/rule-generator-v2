import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// NextAuth core tables — names match @auth/drizzle-adapter defaults.

export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
})

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// App-specific tables.

export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  anthropicKeyCiphertext: text('anthropic_key_ciphertext'),
  anthropicKeyIv: text('anthropic_key_iv'),
  anthropicKeyTag: text('anthropic_key_tag'),
  anthropicKeyHint: text('anthropic_key_hint'),
  // LLM provider selection — 'anthropic' (cloud Claude) or 'ollama'
  // (local model the user's browser talks to directly).
  llmProvider: text('llm_provider').notNull().default('anthropic'),
  ollamaBaseUrl: text('ollama_base_url'),
  ollamaModel: text('ollama_model'),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    techStack: jsonb('tech_stack').$type<string[]>().notNull().default([]),
    // Output format used when writing skill files (and, in future,
    // possibly rule files too). Defaults to Cursor conventions.
    skillFormat: text('skill_format').notNull().default('cursor'),
    // Output format for rule files. Default = Cursor (.cursor/rules/<slug>.mdc).
    ruleFormat: text('rule_format').notNull().default('cursor'),
    createdAt: timestamp('created_at', { mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (p) => ({
    userIdx: uniqueIndex('projects_user_id_created_idx').on(p.userId, p.createdAt, p.id),
  })
)

export const sections = pgTable('sections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  globs: text('globs').notNull().default(''),
  alwaysApply: boolean('always_apply').notNull().default(false),
  description: text('description').notNull().default(''),
  requirements: text('requirements').notNull().default(''),
  generatedContent: text('generated_content').notNull().default(''),
  filename: text('filename').notNull().default(''),
  order: integer('order').notNull().default(0),
})

export const projectGithubLinks = pgTable('project_github_links', {
  projectId: text('project_id')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  owner: text('owner').notNull(),
  repo: text('repo').notNull(),
  branch: text('branch').notNull().default('main'),
  rulesPath: text('rules_path').notNull().default('.cursor/rules'),
  defaultBranch: text('default_branch'),
  lastPushedSha: text('last_pushed_sha'),
  lastPushedAt: timestamp('last_pushed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export type TemplateSectionData = {
  name: string
  type: string
  globs: string
  alwaysApply: boolean
  description: string
  requirements: string
  order: number
}

export const userTemplates = pgTable('user_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('custom'),
  techTags: jsonb('tech_tags').$type<string[]>().notNull().default([]),
  sections: jsonb('sections').$type<TemplateSectionData[]>().notNull().default([]),
  createdAt: timestamp('created_at', { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const skills = pgTable('skills', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  body: text('body').notNull().default(''),
  allowedTools: jsonb('allowed_tools').$type<string[]>().notNull().default([]),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
})
