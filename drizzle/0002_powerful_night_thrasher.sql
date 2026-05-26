ALTER TABLE "user_settings" ADD COLUMN "llm_provider" text DEFAULT 'anthropic' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ollama_base_url" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ollama_model" text;