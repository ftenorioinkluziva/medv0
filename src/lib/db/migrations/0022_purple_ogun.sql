ALTER TYPE "public"."analysis_role" ADD VALUE 'product_generator';--> statement-breakpoint
CREATE TABLE "generated_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"living_analysis_version_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"product_type" text NOT NULL,
	"content" jsonb,
	"status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"tokens_used" integer,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_products" ADD CONSTRAINT "generated_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_products" ADD CONSTRAINT "generated_products_living_analysis_version_id_living_analysis_versions_id_fk" FOREIGN KEY ("living_analysis_version_id") REFERENCES "public"."living_analysis_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_products" ADD CONSTRAINT "generated_products_agent_id_health_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."health_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_products_user_id_idx" ON "generated_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_products_version_id_idx" ON "generated_products" USING btree ("living_analysis_version_id");