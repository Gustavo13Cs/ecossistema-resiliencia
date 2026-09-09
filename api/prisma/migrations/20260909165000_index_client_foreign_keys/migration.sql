-- IndexClientForeignKeys
-- Cover the foreign keys introduced by the professional-owned Client model.

CREATE INDEX "client_audit_events_clientId_idx"
  ON "client_audit_events"("clientId");

CREATE INDEX "diet_plans_clientId_idx"
  ON "diet_plans"("clientId");
