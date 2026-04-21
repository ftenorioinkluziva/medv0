CREATE TYPE "public"."document_category" AS ENUM('bioimpedance', 'blood_test', 'other');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "category" "document_category";--> statement-breakpoint
UPDATE "documents" SET "category" = 'bioimpedance' WHERE "document_type" = 'body_composition';--> statement-breakpoint
UPDATE "documents" SET "category" = 'blood_test' WHERE "document_type" = 'lab_test';--> statement-breakpoint
UPDATE "documents" SET "category" = 'other' WHERE "category" IS NULL;