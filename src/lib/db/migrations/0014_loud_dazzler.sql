CREATE TABLE "body_composition_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"weight" numeric(5, 2),
	"body_fat" numeric(5, 2),
	"muscle_mass" numeric(5, 2),
	"visceral_fat" numeric(5, 2),
	"bone_mass" numeric(5, 2),
	"bmr" integer,
	"body_water" numeric(5, 2),
	"measured_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "muscle_mass" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "visceral_fat_level" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "bone_mass" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "basal_metabolic_rate" integer;--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "body_water_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD CONSTRAINT "body_composition_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD CONSTRAINT "body_composition_history_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_composition_history_user_date_idx" ON "body_composition_history" USING btree ("user_id","measured_at");