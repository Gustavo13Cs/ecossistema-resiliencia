-- FK de Client e agregação do prontuário.
CREATE INDEX "workouts_clientId_idx" ON "workouts"("clientId");

-- FK de Client e agregação do prontuário.
CREATE INDEX "rehab_plans_clientId_idx" ON "rehab_plans"("clientId");

-- Overview por Client e data; FK independente do autor.
CREATE INDEX "physio_assessments_clientId_date_idx" ON "physio_assessments"("clientId", "date");

-- FK de Client e histórico do prontuário.
CREATE INDEX "anamneses_clientId_createdAt_idx" ON "anamneses"("clientId", "createdAt");

-- FK de Client e histórico do prontuário.
CREATE INDEX "consultation_notes_clientId_createdAt_idx" ON "consultation_notes"("clientId", "createdAt");

-- FK de Client e histórico do prontuário.
CREATE INDEX "supplement_plans_clientId_createdAt_idx" ON "supplement_plans"("clientId", "createdAt");

-- Overview por Client/data e FK.
CREATE INDEX "lab_exams_clientId_date_idx" ON "lab_exams"("clientId", "date");

-- FK de Client e pedidos por prontuário.
CREATE INDEX "lab_orders_clientId_issuedAt_idx" ON "lab_orders"("clientId", "issuedAt");

-- Include de fichas e cascade de exclusão do treino.
CREATE INDEX "workout_splits_workoutId_idx" ON "workout_splits"("workoutId");

-- Include de exercícios e cascade de exclusão da ficha.
CREATE INDEX "workout_exercises_splitId_idx" ON "workout_exercises"("splitId");

-- Include de sessões e cascade de exclusão do plano.
CREATE INDEX "rehab_sessions_rehabPlanId_idx" ON "rehab_sessions"("rehabPlanId");

-- Include de exercícios e cascade de exclusão da sessão.
CREATE INDEX "rehab_exercises_sessionId_idx" ON "rehab_exercises"("sessionId");

-- Include de itens e cascade de exclusão da prescrição.
CREATE INDEX "supplement_items_planId_idx" ON "supplement_items"("planId");

-- Include de marcadores e cascade de exclusão do exame.
CREATE INDEX "lab_markers_examId_idx" ON "lab_markers"("examId");

-- Include de refeições e cascade de exclusão da dieta.
CREATE INDEX "meals_dietPlanId_idx" ON "meals"("dietPlanId");

-- Include de itens e cascade de exclusão da refeição.
CREATE INDEX "meal_items_mealId_idx" ON "meal_items"("mealId");

-- FoodsService.remove verifica uso do alimento nas prescrições.
CREATE INDEX "meal_items_foodId_idx" ON "meal_items"("foodId");

-- Cron: autor/Client/tipo e faixa temporal ordenada.
CREATE INDEX "DailyTracking_professionalId_clientId_type_completedAt_idx" ON "DailyTracking"("professionalId", "clientId", "type", "completedAt");

-- ClientGoalsService.findAll ordena todas as metas do profissional.
CREATE INDEX "client_goals_professionalId_updatedAt_idx" ON "client_goals"("professionalId", "updatedAt");

-- LabOrdersService.findAll ordena os pedidos do profissional.
CREATE INDEX "lab_orders_professionalId_issuedAt_idx" ON "lab_orders"("professionalId", "issuedAt");
