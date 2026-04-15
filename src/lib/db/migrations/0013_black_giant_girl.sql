ALTER TABLE "health_agents" ADD COLUMN "model_config" jsonb;--> statement-breakpoint
ALTER TABLE "health_agents" ADD COLUMN "output_schema" jsonb;--> statement-breakpoint
ALTER TABLE "health_agents" ADD COLUMN "output_type" text DEFAULT 'text' NOT NULL;