CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_source_idx" ON "knowledge_base" USING btree ("source");--> statement-breakpoint
CREATE INDEX "analyses_user_id_idx" ON "analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analyses_living_analysis_version_id_idx" ON "analyses" USING btree ("living_analysis_version_id");--> statement-breakpoint
CREATE INDEX "living_analysis_versions_living_analysis_id_idx" ON "living_analysis_versions" USING btree ("living_analysis_id");