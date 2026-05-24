// Run database migrations against DATABASE_URL.
// Usage:  npx tsx scripts/migrate.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required to run migrations')
  const sql = neon(url)
  const db = drizzle(sql)
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations applied.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
