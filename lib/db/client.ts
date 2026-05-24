import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Use a syntactically-valid placeholder during build so that route files which
// import this module don't crash when DATABASE_URL is not yet set. Actual
// queries will fail loudly at request time if the env var is missing.
const PLACEHOLDER = 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
const connectionString = process.env.DATABASE_URL || PLACEHOLDER

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL is not set — using placeholder. Set it in .env.local')
}

const sql = neon(connectionString)

export const db = drizzle(sql, { schema })
export type DB = typeof db
