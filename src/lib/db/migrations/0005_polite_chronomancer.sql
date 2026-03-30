CREATE TYPE "public"."analysis_role" AS ENUM('foundation', 'specialized', 'none');--> statement-breakpoint
CREATE TABLE "health_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"specialty" text NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"analysis_role" "analysis_role" NOT NULL,
	"model" text DEFAULT 'google/gemini-2.5-flash' NOT NULL,
	"temperature" numeric(3, 2) DEFAULT '0.7' NOT NULL,
	"max_tokens" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
