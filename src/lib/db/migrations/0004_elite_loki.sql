CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"source" text,
	"author" text,
	"published_date" date,
	"category" text,
	"subcategory" text,
	"tags" text[],
	"language" text DEFAULT 'pt-BR' NOT NULL,
	"is_verified" text DEFAULT 'unverified' NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_analyzed_at" timestamp,
	"analysis_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_embeddings" ADD CONSTRAINT "knowledge_embeddings_article_id_knowledge_base_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_embeddings_hnsw_idx" ON "knowledge_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);