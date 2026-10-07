-- Implementacao local aprovada. Nao provisiona LOGINs, senhas ou conexoes de producao.
BEGIN;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['safemove_clinical','safemove_auth','safemove_jobs','safemove_catalog_lookup','safemove_audit_delivery','safemove_data_api_denied'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOBYPASSRLS',role_name);
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname=role_name AND (rolcanlogin OR rolsuper OR rolbypassrls)) THEN
      RAISE EXCEPTION 'Unsafe existing SafeMove group role';
    END IF;
  END LOOP;
END $$;
CREATE TYPE "ReadAuditActor" AS ENUM ('PROFESSIONAL','SYSTEM');
CREATE TYPE "ReadAuditAction" AS ENUM ('READ','LIST','EXPORT');
CREATE TYPE "ReadAuditDomain" AS ENUM ('CLIENT','OVERVIEW','DIET','WORKOUT','REHAB','ASSESSMENT','PHYSIO_ASSESSMENT','ANAMNESIS','CONSULTATION_NOTE','SUPPLEMENT','LAB_EXAM','LAB_ORDER','CLIENT_GOAL','APPOINTMENT','ALERT','AUDIT');
CREATE TABLE client_read_audit_events (
 id text PRIMARY KEY, "occurredAt" timestamptz NOT NULL DEFAULT now(),
 "tenantProfessionalId" text NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "clientId" text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
 "actorType" "ReadAuditActor" NOT NULL,
 "actorProfessionalId" text REFERENCES "User"(id) ON DELETE RESTRICT,
 "sessionId" text, "systemTaskId" text, action "ReadAuditAction" NOT NULL,
 domain "ReadAuditDomain" NOT NULL, "requestId" text NOT NULL,
 CONSTRAINT read_audit_actor_check CHECK (
  ("actorType"='PROFESSIONAL' AND "actorProfessionalId"="tenantProfessionalId"
    AND "actorProfessionalId" IS NOT NULL AND length("sessionId")>0 AND "sessionId" IS NOT NULL AND "systemTaskId" IS NULL)
  OR ("actorType"='SYSTEM' AND "actorProfessionalId" IS NULL AND "sessionId" IS NULL AND "systemTaskId" IS NOT NULL AND "systemTaskId"='alerts.daily')
 ),
 CONSTRAINT read_audit_request_check CHECK (length("requestId")>0),
 UNIQUE ("requestId","clientId",action,domain)
);
CREATE INDEX read_audit_tenant_time_idx ON client_read_audit_events("tenantProfessionalId","occurredAt");
CREATE INDEX read_audit_client_time_idx ON client_read_audit_events("clientId","occurredAt");
CREATE INDEX read_audit_actor_time_idx ON client_read_audit_events("actorProfessionalId","occurredAt");
CREATE TABLE audit_delivery_states (
 "eventId" text PRIMARY KEY REFERENCES client_read_audit_events(id) ON DELETE RESTRICT,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
 "leaseUntil" timestamptz, "leaseToken" text, "deliveredAt" timestamptz,
 CONSTRAINT delivery_lease_check CHECK (("leaseUntil" IS NULL)=("leaseToken" IS NULL))
);
CREATE INDEX audit_delivery_pending_idx ON audit_delivery_states("deliveredAt","leaseUntil");
CREATE SCHEMA safemove_private;
REVOKE ALL ON SCHEMA safemove_private FROM PUBLIC;
GRANT USAGE ON SCHEMA safemove_private, public TO safemove_clinical,safemove_auth,safemove_jobs,safemove_catalog_lookup,safemove_audit_delivery;

CREATE FUNCTION safemove_private.professional_id() RETURNS text LANGUAGE sql STABLE
 SET search_path=pg_catalog AS $$ SELECT NULLIF(current_setting('safemove.professional_id',true),'') $$;
CREATE FUNCTION safemove_private.is_clinical() RETURNS boolean LANGUAGE sql STABLE
 SET search_path=pg_catalog AS $$ SELECT current_setting('safemove.role',true) IN ('NUTRITIONIST','PERSONAL','PHYSIO') AND safemove_private.professional_id() IS NOT NULL $$;
CREATE FUNCTION safemove_private.owned_client(client_id text) RETURNS boolean LANGUAGE sql STABLE
 SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM public.clients WHERE id=client_id AND "professionalId"=safemove_private.professional_id()) $$;

-- As policies antigas PUBLIC false tambem negariam o papel clinico sem bypass.
-- Grants e policies continuam negando a Data API, sem tornar PUBLIC permissivo.
DO $$ DECLARE t record; data_role text; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relname<>'_prisma_migrations'
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t.relname);
  IF EXISTS (SELECT FROM pg_policies WHERE schemaname='public' AND tablename=t.relname AND policyname='deny_data_api_access') THEN
    EXECUTE format('ALTER POLICY deny_data_api_access ON public.%I TO safemove_data_api_denied',t.relname);
  ELSE
    EXECUTE format('CREATE POLICY deny_data_api_access ON public.%I AS RESTRICTIVE TO safemove_data_api_denied USING(false) WITH CHECK(false)',t.relname);
  END IF;
  FOREACH data_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT FROM pg_roles WHERE rolname=data_role) THEN
    EXECUTE format('REVOKE ALL ON public.%I FROM %I',t.relname,data_role);
   END IF;
  END LOOP;
 END LOOP;
 EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC',current_user);
 FOREACH data_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT FROM pg_roles WHERE rolname=data_role) THEN
   EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',current_user,data_role);
  END IF;
 END LOOP;
END $$;

CREATE POLICY clinical_owner ON clients TO safemove_clinical
 USING(safemove_private.is_clinical() AND "professionalId"=safemove_private.professional_id())
 WITH CHECK(safemove_private.is_clinical() AND "professionalId"=safemove_private.professional_id());
GRANT SELECT,INSERT,UPDATE,DELETE ON clients TO safemove_clinical;
-- A policy WITH CHECK impede transferencia; o modelo de dono unico nao oferece esse fluxo.

CREATE POLICY own_profile ON "User" TO safemove_clinical
 USING(id=safemove_private.professional_id()) WITH CHECK(id=safemove_private.professional_id());
CREATE POLICY pre_auth ON "User" TO safemove_auth USING(true) WITH CHECK(true);
CREATE POLICY pre_auth_sessions ON auth_sessions TO safemove_auth USING(true) WITH CHECK(true);
GRANT SELECT(id,name,email,password,role,"authVersion",phone,"companyName","createdAt","updatedAt") ON "User" TO safemove_auth;
GRANT INSERT(id,name,email,password,role,"authVersion",phone,"companyName","createdAt","updatedAt") ON "User" TO safemove_auth;
GRANT UPDATE(password,role,"authVersion","updatedAt") ON "User" TO safemove_auth;
GRANT SELECT,INSERT,UPDATE,DELETE ON auth_sessions TO safemove_auth;
GRANT SELECT ON "User" TO safemove_clinical;
REVOKE SELECT(password,"authVersion") ON "User" FROM safemove_clinical;
-- REVOKE de coluna nao reduz grant de tabela; substituir por lista explicita abaixo.
REVOKE SELECT ON "User" FROM safemove_clinical;
DO $$ DECLARE columns text; BEGIN
 SELECT string_agg(quote_ident(column_name),',') INTO columns FROM information_schema.columns
 WHERE table_schema='public' AND table_name='User' AND column_name NOT IN ('password','authVersion');
 EXECUTE format('GRANT SELECT(%s) ON public."User" TO safemove_clinical',columns);
 SELECT string_agg(quote_ident(column_name),',') INTO columns FROM information_schema.columns
 WHERE table_schema='public' AND table_name='User' AND column_name NOT IN ('id','password','authVersion','role','email','createdAt');
 EXECUTE format('GRANT UPDATE(%s) ON public."User" TO safemove_clinical',columns);
END $$;
CREATE POLICY owned_legacy_link ON professional_patient_links FOR SELECT TO safemove_clinical
 USING(safemove_private.is_clinical() AND "professionalId"=safemove_private.professional_id());
GRANT SELECT ON professional_patient_links TO safemove_clinical;

CREATE POLICY clinical_owner ON "client_audit_events" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT ON "client_audit_events" TO safemove_clinical;

CREATE POLICY clinical_owner ON "appointments" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "appointments" TO safemove_clinical;

CREATE POLICY clinical_owner ON "appointment_events" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND EXISTS(SELECT 1 FROM public.appointments a WHERE a.id="appointmentId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND EXISTS(SELECT 1 FROM public.appointments a WHERE a.id="appointmentId")));
GRANT SELECT,INSERT ON "appointment_events" TO safemove_clinical;

CREATE POLICY clinical_owner ON "recipes" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id())) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id()));
GRANT SELECT,INSERT,UPDATE,DELETE ON "recipes" TO safemove_clinical;

CREATE POLICY clinical_owner ON "diet_plans" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND (safemove_private.owned_client("clientId") OR ("clientId" IS NULL AND "userId" IS NULL AND "isTemplate")))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND (safemove_private.owned_client("clientId") OR ("clientId" IS NULL AND "userId" IS NULL AND "isTemplate"))));
GRANT SELECT,INSERT,UPDATE,DELETE ON "diet_plans" TO safemove_clinical;

CREATE POLICY clinical_owner ON "workouts" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND (safemove_private.owned_client("clientId") OR ("clientId" IS NULL AND "userId" IS NULL AND "isTemplate")))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND (safemove_private.owned_client("clientId") OR ("clientId" IS NULL AND "userId" IS NULL AND "isTemplate"))));
GRANT SELECT,INSERT,UPDATE,DELETE ON "workouts" TO safemove_clinical;

CREATE POLICY clinical_owner ON "rehab_plans" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND (safemove_private.owned_client("clientId") OR ("clientId" IS NULL AND "userId" IS NULL AND "isTemplate")))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND (safemove_private.owned_client("clientId") OR ("clientId" IS NULL AND "userId" IS NULL AND "isTemplate"))));
GRANT SELECT,INSERT,UPDATE,DELETE ON "rehab_plans" TO safemove_clinical;

CREATE POLICY clinical_owner ON "physical_assessments" TO safemove_clinical USING(safemove_private.is_clinical() AND (safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND (safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "physical_assessments" TO safemove_clinical;

CREATE POLICY clinical_owner ON "physio_assessments" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "physio_assessments" TO safemove_clinical;

CREATE POLICY clinical_owner ON "anamneses" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "anamneses" TO safemove_clinical;

CREATE POLICY clinical_owner ON "consultation_notes" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "consultation_notes" TO safemove_clinical;

CREATE POLICY clinical_owner ON "supplement_plans" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "supplement_plans" TO safemove_clinical;

CREATE POLICY clinical_owner ON "lab_exams" TO safemove_clinical USING(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("creatorId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "lab_exams" TO safemove_clinical;

CREATE POLICY clinical_owner ON "patient_alerts" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "patient_alerts" TO safemove_clinical;

CREATE POLICY clinical_owner ON "client_goals" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "client_goals" TO safemove_clinical;

CREATE POLICY clinical_owner ON "lab_orders" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "lab_orders" TO safemove_clinical;

CREATE POLICY clinical_owner ON "DailyTracking" TO safemove_clinical USING(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId"))) WITH CHECK(safemove_private.is_clinical() AND ("professionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON "DailyTracking" TO safemove_clinical;

CREATE POLICY clinical_owner ON "food_preferences" TO safemove_clinical USING(safemove_private.is_clinical() AND ("nutritionistId"=safemove_private.professional_id())) WITH CHECK(safemove_private.is_clinical() AND ("nutritionistId"=safemove_private.professional_id()));
GRANT SELECT,INSERT,UPDATE,DELETE ON "food_preferences" TO safemove_clinical;
CREATE POLICY clinical_child ON recipe_versions TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.recipes p WHERE p.id="recipeId")) WITH CHECK(EXISTS(SELECT 1 FROM public.recipes p WHERE p.id="recipeId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON recipe_versions TO safemove_clinical;
CREATE POLICY clinical_child ON recipe_ingredients TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.recipe_versions p WHERE p.id="recipeVersionId")) WITH CHECK(EXISTS(SELECT 1 FROM public.recipe_versions p WHERE p.id="recipeVersionId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON recipe_ingredients TO safemove_clinical;
CREATE POLICY clinical_child ON meals TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.diet_plans p WHERE p.id="dietPlanId")) WITH CHECK(EXISTS(SELECT 1 FROM public.diet_plans p WHERE p.id="dietPlanId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON meals TO safemove_clinical;
CREATE POLICY clinical_child ON meal_items TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.meals p WHERE p.id="mealId") AND ("recipeVersionId" IS NULL OR EXISTS(SELECT 1 FROM public.recipe_versions v WHERE v.id="recipeVersionId"))) WITH CHECK(EXISTS(SELECT 1 FROM public.meals p WHERE p.id="mealId") AND ("recipeVersionId" IS NULL OR EXISTS(SELECT 1 FROM public.recipe_versions v WHERE v.id="recipeVersionId")));
GRANT SELECT,INSERT,UPDATE,DELETE ON meal_items TO safemove_clinical;
CREATE POLICY clinical_child ON workout_splits TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.workouts p WHERE p.id="workoutId")) WITH CHECK(EXISTS(SELECT 1 FROM public.workouts p WHERE p.id="workoutId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON workout_splits TO safemove_clinical;
CREATE POLICY clinical_child ON workout_exercises TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.workout_splits p WHERE p.id="splitId")) WITH CHECK(EXISTS(SELECT 1 FROM public.workout_splits p WHERE p.id="splitId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON workout_exercises TO safemove_clinical;
CREATE POLICY clinical_child ON rehab_sessions TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.rehab_plans p WHERE p.id="rehabPlanId")) WITH CHECK(EXISTS(SELECT 1 FROM public.rehab_plans p WHERE p.id="rehabPlanId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON rehab_sessions TO safemove_clinical;
CREATE POLICY clinical_child ON rehab_exercises TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.rehab_sessions p WHERE p.id="sessionId")) WITH CHECK(EXISTS(SELECT 1 FROM public.rehab_sessions p WHERE p.id="sessionId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON rehab_exercises TO safemove_clinical;
CREATE POLICY clinical_child ON supplement_items TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.supplement_plans p WHERE p.id="planId")) WITH CHECK(EXISTS(SELECT 1 FROM public.supplement_plans p WHERE p.id="planId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON supplement_items TO safemove_clinical;
CREATE POLICY clinical_child ON lab_markers TO safemove_clinical USING(EXISTS(SELECT 1 FROM public.lab_exams p WHERE p.id="examId")) WITH CHECK(EXISTS(SELECT 1 FROM public.lab_exams p WHERE p.id="examId"));
GRANT SELECT,INSERT,UPDATE,DELETE ON lab_markers TO safemove_clinical;

-- Retorno minimo: booleano; definer sem login, bypass ou ownership de tabela.
CREATE POLICY catalog_reference ON meal_items FOR SELECT TO safemove_catalog_lookup USING(true);
CREATE POLICY catalog_reference ON recipe_ingredients FOR SELECT TO safemove_catalog_lookup USING(true);
GRANT SELECT("foodId") ON meal_items,recipe_ingredients TO safemove_catalog_lookup;
CREATE FUNCTION safemove_private.food_in_use(food_id text) RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.meal_items WHERE "foodId"=food_id)
   OR EXISTS(SELECT 1 FROM public.recipe_ingredients WHERE "foodId"=food_id)
 $$;
GRANT CREATE ON SCHEMA safemove_private TO safemove_catalog_lookup;
ALTER FUNCTION safemove_private.food_in_use(text) OWNER TO safemove_catalog_lookup;
REVOKE CREATE ON SCHEMA safemove_private FROM safemove_catalog_lookup;
REVOKE ALL ON FUNCTION safemove_private.food_in_use(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION safemove_private.food_in_use(text) TO safemove_clinical;
CREATE POLICY catalog_read ON foods FOR SELECT TO safemove_clinical USING(safemove_private.is_clinical());
-- UPDATE USING tambem participa de FOR SHARE. WITH CHECK e trigger bloqueiam mutacoes.
CREATE POLICY catalog_lock ON foods FOR UPDATE TO safemove_clinical
 USING(safemove_private.is_clinical()) WITH CHECK(source='MANUAL' AND NOT safemove_private.food_in_use(id));
CREATE POLICY catalog_create ON foods FOR INSERT TO safemove_clinical WITH CHECK(safemove_private.is_clinical() AND source IN ('MANUAL','SAFE_MOVE_TEMPLATE'));
CREATE POLICY catalog_delete ON foods FOR DELETE TO safemove_clinical
 USING(safemove_private.is_clinical() AND source='MANUAL' AND NOT safemove_private.food_in_use(id));
GRANT SELECT,INSERT,DELETE ON foods TO safemove_clinical;
DO $$ DECLARE columns text; BEGIN
 SELECT string_agg(quote_ident(column_name),',') INTO columns FROM information_schema.columns
 WHERE table_schema='public' AND table_name='foods' AND column_name NOT IN ('id','source');
 EXECUTE format('GRANT UPDATE(%s) ON public.foods TO safemove_clinical',columns);
END $$;
CREATE FUNCTION safemove_private.protect_food() RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog,pg_temp AS $$ BEGIN
 -- FOR UPDATE conflita com KEY SHARE adquirido pela FK de novas referencias.
 -- Revalidar depois da espera; NO KEY UPDATE escalar sozinho nao basta.
 PERFORM 1 FROM public.foods WHERE id=OLD.id FOR UPDATE;
 IF OLD.source<>'MANUAL' OR safemove_private.food_in_use(OLD.id) THEN
  RAISE EXCEPTION 'Referenced or official catalog entry is immutable' USING ERRCODE='42501';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.source<>OLD.source) THEN
  RAISE EXCEPTION 'Catalog identity is immutable' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER food_immutable BEFORE UPDATE OR DELETE ON foods FOR EACH ROW EXECUTE FUNCTION safemove_private.protect_food();

CREATE POLICY clinical_audit ON client_read_audit_events TO safemove_clinical
 USING("tenantProfessionalId"=safemove_private.professional_id() AND safemove_private.is_clinical())
 WITH CHECK("actorType"='PROFESSIONAL' AND "actorProfessionalId"=safemove_private.professional_id()
 AND "tenantProfessionalId"=safemove_private.professional_id() AND safemove_private.owned_client("clientId")
 AND "sessionId"=current_setting('safemove.session_id',true)
 AND "requestId"=current_setting('safemove.request_id',true));
GRANT SELECT,INSERT ON client_read_audit_events TO safemove_clinical;
CREATE POLICY clinical_outbox ON audit_delivery_states TO safemove_clinical
 USING(EXISTS(SELECT 1 FROM public.client_read_audit_events e WHERE e.id="eventId"))
 WITH CHECK(attempts=0 AND "deliveredAt" IS NULL AND "leaseUntil" IS NULL AND "leaseToken" IS NULL AND EXISTS(SELECT 1 FROM public.client_read_audit_events e WHERE e.id="eventId"));
GRANT INSERT ON audit_delivery_states TO safemove_clinical;

CREATE FUNCTION safemove_private.immutable_audit() RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog AS $$ BEGIN
 RAISE EXCEPTION 'Audit trail is immutable' USING ERRCODE='42501';
 END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON client_read_audit_events FOR EACH ROW EXECUTE FUNCTION safemove_private.immutable_audit();
CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON client_read_audit_events FOR EACH STATEMENT EXECUTE FUNCTION safemove_private.immutable_audit();

-- Job conhece somente IDs/role e dados de treino necessarios ao snapshot de alerts.
CREATE POLICY alerts_job_profile ON "User" FOR SELECT TO safemove_jobs USING(role='PERSONAL');
GRANT SELECT(id,role) ON "User" TO safemove_jobs;
CREATE POLICY alerts_job_client ON clients FOR SELECT TO safemove_jobs USING(
 status='ACTIVE' AND EXISTS(SELECT FROM public."User" u WHERE u.id="professionalId" AND u.role='PERSONAL'));
GRANT SELECT(id,"professionalId",status) ON clients TO safemove_jobs;
CREATE POLICY alerts_job_tracking ON "DailyTracking" FOR SELECT TO safemove_jobs USING(
 type='WORKOUT' AND EXISTS(SELECT FROM public.clients c WHERE c.id="clientId" AND c."professionalId"="DailyTracking"."professionalId"));
GRANT SELECT(id,"clientId","professionalId",type,"completedAt") ON "DailyTracking" TO safemove_jobs;
CREATE POLICY alerts_job_snapshot ON patient_alerts TO safemove_jobs USING(
 EXISTS(SELECT FROM public.clients c WHERE c.id="clientId" AND c."professionalId"=patient_alerts."professionalId"))
 WITH CHECK(EXISTS(SELECT FROM public.clients c WHERE c.id="clientId" AND c."professionalId"=patient_alerts."professionalId"));
GRANT SELECT,INSERT,DELETE ON patient_alerts TO safemove_jobs;
CREATE POLICY alerts_job_audit ON client_read_audit_events TO safemove_jobs USING("actorType"='SYSTEM' AND "systemTaskId" IS NOT NULL AND "systemTaskId"='alerts.daily')
 WITH CHECK("actorType"='SYSTEM' AND "systemTaskId"='alerts.daily' AND domain='ALERT' AND action='READ'
 AND EXISTS(SELECT FROM public.clients c WHERE c.id="clientId" AND c."professionalId"="tenantProfessionalId"));
GRANT SELECT,INSERT ON client_read_audit_events TO safemove_jobs;
CREATE POLICY alerts_job_outbox ON audit_delivery_states FOR INSERT TO safemove_jobs WITH CHECK(attempts=0 AND "deliveredAt" IS NULL AND "leaseUntil" IS NULL AND "leaseToken" IS NULL AND
 EXISTS(SELECT FROM public.client_read_audit_events e WHERE e.id="eventId"));
GRANT INSERT ON audit_delivery_states TO safemove_jobs;
CREATE POLICY audit_delivery_read ON client_read_audit_events FOR SELECT TO safemove_audit_delivery USING(true);
CREATE POLICY audit_delivery_state ON audit_delivery_states TO safemove_audit_delivery USING(true) WITH CHECK(true);
GRANT SELECT ON client_read_audit_events TO safemove_audit_delivery;
GRANT SELECT,UPDATE ON audit_delivery_states TO safemove_audit_delivery;
-- Helpers invoker nao elevam autoridade; nenhuma funcao privada fica PUBLIC EXECUTE.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA safemove_private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION safemove_private.professional_id(),safemove_private.is_clinical(),safemove_private.owned_client(text),safemove_private.protect_food() TO safemove_clinical;
GRANT EXECUTE ON FUNCTION safemove_private.food_in_use(text) TO safemove_clinical;
ALTER DEFAULT PRIVILEGES IN SCHEMA safemove_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
