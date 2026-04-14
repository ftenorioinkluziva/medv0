CREATE TABLE "agent_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_knowledge_agent_article_unique" UNIQUE("agent_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "is_global" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agent_id_health_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."health_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_article_id_knowledge_base_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_knowledge_agent_id_idx" ON "agent_knowledge" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_knowledge_article_id_idx" ON "agent_knowledge" USING btree ("article_id");