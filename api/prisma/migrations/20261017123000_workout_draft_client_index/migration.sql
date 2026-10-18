-- Cobre a FK Client também fora da consulta por profissional/status.
CREATE INDEX "workout_drafts_clientId_idx" ON "workout_drafts"("clientId");
