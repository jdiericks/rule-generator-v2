ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "rule_format" text DEFAULT 'cursor' NOT NULL;
