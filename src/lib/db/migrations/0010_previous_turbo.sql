ALTER TABLE "knowledge_embeddings" ADD COLUMN "content_tsv" "tsvector";--> statement-breakpoint
CREATE INDEX "knowledge_embeddings_gin_idx" ON "knowledge_embeddings" USING gin ("content_tsv");