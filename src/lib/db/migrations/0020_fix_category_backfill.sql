-- Corrective backfill: maps real document_type values to document_category enum
-- Enum values in DB: bioimpedance | blood_test | other
-- Covers Portuguese names, descriptive English names, and legacy exact-match values
-- Safe to run multiple times (only updates rows where category IS NULL or 'other')

UPDATE "documents"
SET "category" = 'bioimpedance'
WHERE (
  "document_type" ILIKE '%bioimpedanc%'
  OR "document_type" ILIKE '%body composition%'
  OR "document_type" ILIKE '%composicao corporal%'
  OR "document_type" ILIKE '%composição corporal%'
  OR "document_type" = 'body_composition'
)
AND ("category" IS NULL OR "category" = 'other');--> statement-breakpoint

UPDATE "documents"
SET "category" = 'blood_test'
WHERE (
  "document_type" ILIKE '%hemograma%'
  OR "document_type" ILIKE '%laborator%'
  OR "document_type" ILIKE '%exame%'
  OR "document_type" ILIKE '%sangue%'
  OR "document_type" ILIKE '%blood%'
  OR "document_type" ILIKE '%lab_report%'
  OR "document_type" ILIKE '%lab report%'
  OR "document_type" ILIKE '%bioquimic%'
  OR "document_type" ILIKE '%bioquímic%'
  OR "document_type" ILIKE '%raio%'
  OR "document_type" ILIKE '%radiolog%'
  OR "document_type" = 'lab_test'
)
AND ("category" IS NULL OR "category" = 'other');--> statement-breakpoint

UPDATE "documents"
SET "category" = 'other'
WHERE "category" IS NULL;
