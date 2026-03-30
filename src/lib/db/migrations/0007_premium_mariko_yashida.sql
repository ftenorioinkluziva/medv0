CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"complete_analysis_id" uuid,
	"agent_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"analysis_role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"rag_context_used" boolean DEFAULT false NOT NULL,
	"tokens_used" integer,
	"duration_ms" integer,
	"status" text DEFAULT 'completed' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complete_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"report_markdown" text DEFAULT '' NOT NULL,
	"analysis_data" jsonb,
	"agents_count" integer DEFAULT 0 NOT NULL,
	"foundation_completed" integer DEFAULT 0 NOT NULL,
	"specialized_completed" integer DEFAULT 0 NOT NULL,
	"total_duration_ms" integer,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "complete_analyses_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_complete_analysis_id_complete_analyses_id_fk" FOREIGN KEY ("complete_analysis_id") REFERENCES "public"."complete_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_agent_id_health_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."health_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complete_analyses" ADD CONSTRAINT "complete_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complete_analyses" ADD CONSTRAINT "complete_analyses_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;