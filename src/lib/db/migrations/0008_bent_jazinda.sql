CREATE TABLE "living_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_version" integer DEFAULT 0 NOT NULL,
	"report_markdown" text DEFAULT '' NOT NULL,
	"analysis_data" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "living_analyses_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "living_analysis_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"living_analysis_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"report_markdown" text DEFAULT '' NOT NULL,
	"analysis_data" jsonb,
	"trigger_document_id" uuid NOT NULL,
	"snapshot_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agents_count" integer DEFAULT 0 NOT NULL,
	"foundation_completed" integer DEFAULT 0 NOT NULL,
	"specialized_completed" integer DEFAULT 0 NOT NULL,
	"total_duration_ms" integer,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "living_analysis_version_id" uuid;--> statement-breakpoint
ALTER TABLE "living_analyses" ADD CONSTRAINT "living_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "living_analysis_versions" ADD CONSTRAINT "living_analysis_versions_living_analysis_id_living_analyses_id_fk" FOREIGN KEY ("living_analysis_id") REFERENCES "public"."living_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "living_analysis_versions" ADD CONSTRAINT "living_analysis_versions_trigger_document_id_documents_id_fk" FOREIGN KEY ("trigger_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_living_analysis_version_id_living_analysis_versions_id_fk" FOREIGN KEY ("living_analysis_version_id") REFERENCES "public"."living_analysis_versions"("id") ON DELETE no action ON UPDATE no action;