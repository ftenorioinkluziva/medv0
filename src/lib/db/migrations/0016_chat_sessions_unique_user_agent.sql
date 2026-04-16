CREATE UNIQUE INDEX "chat_sessions_user_id_agent_id_unique" ON "chat_sessions" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_agent_updated_idx" ON "chat_sessions" USING btree ("user_id","agent_id","updated_at");
