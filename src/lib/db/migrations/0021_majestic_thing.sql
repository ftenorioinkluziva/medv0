ALTER TABLE "documents" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."document_category";--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('bioimpedance', 'blood_test', 'other');--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "category" SET DATA TYPE "public"."document_category" USING "category"::"public"."document_category";--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "body_water_liters" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "protein_mass" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "waist_hip_ratio" numeric(4, 3);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "obesity_degree" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "inbody_score" integer;--> statement-breakpoint
ALTER TABLE "medical_profiles" ADD COLUMN "ideal_weight" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "body_water_liters" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "protein_mass" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "waist_hip_ratio" numeric(4, 3);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "obesity_degree" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "inbody_score" integer;--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "ideal_weight" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "lean_mass_arm_right" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "lean_mass_arm_left" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "lean_mass_trunk" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "lean_mass_leg_right" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "lean_mass_leg_left" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "fat_mass_arm_right" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "fat_mass_arm_left" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "fat_mass_trunk" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "fat_mass_leg_right" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "body_composition_history" ADD COLUMN "fat_mass_leg_left" numeric(5, 2);