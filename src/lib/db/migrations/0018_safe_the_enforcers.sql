ALTER TABLE "knowledge_base" ALTER COLUMN "is_global" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "health_agents" ADD COLUMN "chat_prompt" text;