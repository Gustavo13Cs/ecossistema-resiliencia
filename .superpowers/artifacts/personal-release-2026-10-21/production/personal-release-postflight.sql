-- Read-only postflight: catalogs and migration metadata only; no clinical rows.
WITH expected_history(migration_name,checksum) AS (VALUES
    ('20260813000000_baseline','6ce679695eddaae42098b497adece191f48aa3f14071f3552f85e7e83b72fc06'),
    ('20260813120000_add_agenda_core','418751d33c9681e6057c8ccefb8441bdc3d032000f15e42bea5b9682722c57b8'),
    ('20260821190000_add_client_foundation','0f9f18da007f18395ba8d0e2e93d505d5c1ad8f99a991b9f7cd49796c6ec470f'),
    ('20260908194000_backfill_legacy_clients','cb4771a2cb2af33cccad5c9070c8b157d0795bb900b500dcb4148060d8b0ddc8'),
    ('20260909130000_attach_diet_plans_to_clients','4ed2250c38ae16e385a3858725064b7943795d8f3c73e60395b1dc550f71efa1'),
    ('20260909165000_index_client_foreign_keys','8962674a2f36025e82100a3692ce9daf7ee5ebfa3fcd16825225925c4c822dac'),
    ('20260911113000_attach_physical_assessments_to_clients','5198fdad7ef7a4135ab15697bc44ea3e0a062620b39af4a7926de6063863fbf2'),
    ('20260914133000_add_professional_appointments','d7b75b940d1c0350cc1058ae8548955b4aab9fd0fc92eb9de34167ae12fabe3e'),
    ('20260915133000_harden_supabase_data_api_rls','7d87e9a28b6baca25e80e094afefc44fb10e12c3628f9e44f8ef844a9213c923'),
    ('20260921193053_add_versioned_recipe_bank','2e1c6949926609c6428d3c7bbec894b5b3b1d98730e2abcc7d8d05c13b1fe4a7'),
    ('20260929115900_prepare_legacy_consultation_notes_index','b37c06896fb902e4caef76a6d804b593edeb333a7855d3dd4281a0c7b3e00be1'),
    ('20260929120000_add_client_owned_clinical_resources','f5ffbd83141d190fb995d8b13e1498002048c14d5f593bc52e64090303357630'),
    ('20260929123000_add_revocable_auth_sessions','875ebb013d75f05062c26148851038fda88f5652dcd746d56e9ed1f7dc89c72c'),
    ('20260929130000_harden_recipe_function_search_paths','428a99cf17330feba1dc050af9f4961c624a28ebd0f723292812cb83c3ddbcef'),
    ('20260929133000_index_client_owned_foreign_keys','40a3e6748e1e0670208317a80aad0e69496cdaf2afe8a8e8232a1bcf6a08cd6f'),
    ('20261001130000_harden_consultation_notes_data_api','d341ff0639b848d6dfe11a5317a632467ec5d945128adeaf007a5917038c5ac1'),
    ('20261006120000_read_audit_tenant_roles','66bbd17d21f8bddb4ad36df13e7e9fe2ac7cd64adb0ece2646cc659116adc407'),
    ('20261008120000_remove_read_access_history','a3ead2773928767f7e7baa034e5d2051f6ad61e8b17b2e9d48255e7698134a8b'),
    ('20261016150000_advanced_workout_prescription','9c1e41a87c1a832d8e8c774422d8bc76a7bb75a976cc213b1af467d74eb32a8a'),
    ('20261017120000_workout_drafts','8ed10193a00878c58abc8e54cefd343a4a458534de66e3c7f05fe571f7a8f802'),
    ('20261017123000_workout_draft_client_index','da03840afc89c7929d06add63e67e9fa9341bc8e218fdb5ae38909d08b5800d4'),
    ('20261017130000_exercise_demonstrations','08fceddf1b20acc7cfdcca7cae95664f31231d5c37975c3a40410ba90ad832d9')
), completed AS (
  SELECT id,migration_name,checksum,started_at,finished_at,applied_steps_count
  FROM public."_prisma_migrations"
  WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
), expected_columns(table_name,column_name,type_name,not_null) AS (VALUES
  ('workout_drafts','id','text',true),
  ('workout_drafts','professionalId','text',true),
  ('workout_drafts','clientId','text',true),
  ('workout_drafts','status','WorkoutDraftStatus',true),
  ('workout_drafts','schemaVersion','int4',true),
  ('workout_drafts','content','jsonb',false),
  ('workout_drafts','version','int4',true),
  ('workout_drafts','sourceWorkoutId','text',false),
  ('workout_drafts','baseActiveWorkoutId','text',false),
  ('workout_drafts','finalizedWorkoutId','text',false),
  ('workout_drafts','createdAt','timestamp',true),
  ('workout_drafts','updatedAt','timestamp',true),
  ('workout_drafts','closedAt','timestamp',false),
  ('workouts','finalizedAt','timestamp',false),
  ('workouts','revisionOfId','text',false),
  ('custom_exercises','videoUrl','text',false),
  ('custom_exercises','mediaVersion','int4',true),
  ('workout_exercises','librarySource','ExerciseLibrarySource',false),
  ('workout_exercises','libraryExerciseId','text',false),
  ('workout_exercises','demonstrationSnapshot','jsonb',false)
), actual_columns AS (
  SELECT c.relname AS table_name,a.attname AS column_name,t.typname AS type_name,
    a.attnotnull AS not_null,format_type(a.atttypid,a.atttypmod) AS formatted_type,
    pg_get_expr(d.adbin,d.adrelid) AS default_expression
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  JOIN pg_type t ON t.oid=a.atttypid
  LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
  WHERE n.nspname='public'
    AND (c.relname='workout_drafts' OR EXISTS (
      SELECT 1 FROM expected_columns e WHERE e.table_name=c.relname AND e.column_name=a.attname
    ))
), expected_indexes(index_name) AS (VALUES
  ('workout_drafts_pkey'),
  ('workout_drafts_one_open_per_owner_client'),
  ('workout_drafts_finalizedWorkoutId_key'),
  ('workout_drafts_professionalId_status_updatedAt_id_idx'),
  ('workout_drafts_clientId_idx')
), actual_indexes AS (
  SELECT i.relname AS index_name,x.indisunique AS unique_index,x.indisprimary AS primary_index,
    x.indisvalid AS valid,x.indisready AS ready,x.indislive AS live,
    pg_get_indexdef(i.oid) AS definition,pg_get_expr(x.indpred,x.indrelid) AS predicate
  FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid
  WHERE x.indrelid=to_regclass('public.workout_drafts')
), expected_constraints(table_name,constraint_name,kind,reference_table) AS (VALUES
  ('workout_drafts','workout_drafts_pkey','p',NULL),
  ('workout_drafts','workout_drafts_professionalId_fkey','f','User'),
  ('workout_drafts','workout_drafts_clientId_fkey','f','clients'),
  ('workout_drafts','workout_drafts_sourceWorkoutId_fkey','f','workouts'),
  ('workout_drafts','workout_drafts_baseActiveWorkoutId_fkey','f','workouts'),
  ('workout_drafts','workout_drafts_finalizedWorkoutId_fkey','f','workouts'),
  ('workout_drafts','workout_drafts_positive_versions','c',NULL),
  ('workout_drafts','workout_drafts_state_shape','c',NULL),
  ('workouts','workouts_revisionOfId_fkey','f','workouts'),
  ('custom_exercises','custom_exercises_mediaVersion_positive','c',NULL)
), actual_constraints AS (
  SELECT c.relname AS table_name,k.conname AS constraint_name,k.contype::text AS kind,
    k.convalidated AS validated,ref.relname AS reference_table,
    k.confdeltype::text AS delete_action,k.confupdtype::text AS update_action,
    pg_get_constraintdef(k.oid,true) AS definition
  FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_class ref ON ref.oid=k.confrelid
  WHERE n.nspname='public' AND (
    c.relname='workout_drafts' OR EXISTS (
      SELECT 1 FROM expected_constraints e WHERE e.table_name=c.relname AND e.constraint_name=k.conname
    ))
), enum_metadata AS (
  SELECT t.typname AS enum_name,json_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
  FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
  JOIN pg_enum e ON e.enumtypid=t.oid
  WHERE n.nspname='public' AND t.typname IN ('WorkoutDraftStatus','ExerciseLibrarySource')
  GROUP BY t.typname
), policy_metadata AS (
  SELECT p.polname AS policy_name,p.polpermissive AS permissive,p.polcmd::text AS command,
    ARRAY(SELECT r.rolname FROM pg_roles r WHERE r.oid=ANY(p.polroles) ORDER BY r.rolname) AS roles,
    pg_get_expr(p.polqual,p.polrelid) AS using_expression,
    pg_get_expr(p.polwithcheck,p.polrelid) AS check_expression
  FROM pg_policy p WHERE p.polrelid=to_regclass('public.workout_drafts')
), expected_roles(role_name) AS (VALUES
  ('safemove_clinical'),('safemove_auth'),('safemove_jobs'),('safemove_data_api_denied'),
  ('safemove_migration_check'),('anon'),('authenticated'),('service_role')
), role_metadata AS (
  SELECT e.role_name,r.oid IS NOT NULL AS present,r.rolcanlogin AS can_login,
    r.rolsuper AS superuser,r.rolbypassrls AS bypass_rls,r.rolcreatedb AS create_db,
    r.rolcreaterole AS create_role,r.rolinherit AS inherit,
    ARRAY(SELECT memberof.rolname FROM pg_auth_members m JOIN pg_roles memberof ON memberof.oid=m.roleid
          WHERE m.member=r.oid ORDER BY memberof.rolname) AS memberships
  FROM expected_roles e LEFT JOIN pg_roles r ON r.rolname=e.role_name
), draft_privileges AS (
  SELECT r.rolname AS role_name,p.privilege,
    has_table_privilege(r.oid,to_regclass('public.workout_drafts'),p.privilege) AS allowed
  FROM pg_roles r JOIN expected_roles e ON e.role_name=r.rolname
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
), checker_relation_privileges AS (
  SELECT n.nspname AS schema_name,c.relname AS relation_name,p.privilege
  FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege)
  WHERE r.rolname='safemove_migration_check' AND n.nspname IN ('public','safemove_private')
    AND c.relkind IN ('r','p','v','m','f') AND has_table_privilege(r.oid,c.oid,p.privilege)
)
SELECT json_build_object(
  'identity',json_build_object('database',current_database(),'actor',current_user,'server_version',current_setting('server_version')),
  'prisma',json_build_object(
    'expected_completed_count',22,'completed_count',(SELECT count(*) FROM completed),
    'exact_expected_22',(
      (SELECT count(*) FROM completed)=22 AND NOT EXISTS (
        SELECT 1 FROM expected_history e FULL JOIN completed c USING(migration_name)
        WHERE e.migration_name IS NULL OR c.migration_name IS NULL OR e.checksum<>c.checksum
      )
    ),
    'differences',coalesce((SELECT json_agg(json_build_object('name',coalesce(e.migration_name,c.migration_name),'expected',e.checksum,'actual',c.checksum))
      FROM expected_history e FULL JOIN completed c USING(migration_name)
      WHERE e.migration_name IS NULL OR c.migration_name IS NULL OR e.checksum<>c.checksum),'[]'::json),
    'completed_metadata',(SELECT json_agg(c ORDER BY migration_name,id) FROM completed c),
    'unresolved',coalesce((SELECT json_agg(json_build_object('id',id,'name',migration_name,'checksum',checksum,'started_at',started_at,'applied_steps_count',applied_steps_count))
      FROM public."_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL),'[]'::json),
    'rolled_back',coalesce((SELECT json_agg(json_build_object('id',id,'name',migration_name,'checksum',checksum,'started_at',started_at,'finished_at',finished_at,'rolled_back_at',rolled_back_at,'applied_steps_count',applied_steps_count) ORDER BY migration_name,id)
      FROM public."_prisma_migrations" WHERE rolled_back_at IS NOT NULL),'[]'::json)
  ),
  'supabase_operation_history',json_build_object(
    'expected_operation_name','personal_workout_drafts_demonstrations_prisma_sync',
    'matching_count',(SELECT count(*) FROM supabase_migrations.schema_migrations h WHERE h.name::text='personal_workout_drafts_demonstrations_prisma_sync'),
    'matching_metadata',coalesce((SELECT json_agg(json_build_object('version',h.version::text,'name',h.name::text) ORDER BY h.version::text)
      FROM supabase_migrations.schema_migrations h WHERE h.name::text='personal_workout_drafts_demonstrations_prisma_sync'),'[]'::json)
  ),
  'schema',json_build_object(
    'draft_table',(SELECT json_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls_enabled',c.relrowsecurity,'rls_forced',c.relforcerowsecurity) FROM pg_class c WHERE c.oid=to_regclass('public.workout_drafts')),
    'exact_expected_20_columns',(
      (SELECT count(*) FROM actual_columns)=20 AND NOT EXISTS (
        SELECT 1 FROM expected_columns e FULL JOIN actual_columns a USING(table_name,column_name)
        WHERE e.table_name IS NULL OR a.table_name IS NULL OR e.type_name<>a.type_name OR e.not_null<>a.not_null
      )
    ),
    'columns',(SELECT json_agg(a ORDER BY table_name,column_name) FROM actual_columns a),
    'enums',(SELECT json_agg(e ORDER BY enum_name) FROM enum_metadata e),
    'enums_match',((SELECT labels::jsonb FROM enum_metadata WHERE enum_name='WorkoutDraftStatus')='["OPEN","FINALIZED","DISCARDED"]'::jsonb
      AND (SELECT labels::jsonb FROM enum_metadata WHERE enum_name='ExerciseLibrarySource')='["CATALOG","CUSTOM"]'::jsonb),
    'policies',(SELECT json_agg(p ORDER BY policy_name) FROM policy_metadata p),
    'policy_roles_and_modes_match',((SELECT count(*) FROM policy_metadata)=2 AND EXISTS (
      SELECT 1 FROM policy_metadata WHERE policy_name='deny_data_api_access' AND NOT permissive AND command='*'
        AND roles=ARRAY['safemove_data_api_denied']::name[] AND using_expression='false' AND check_expression='false'
    ) AND EXISTS (
      SELECT 1 FROM policy_metadata WHERE policy_name='clinical_owner' AND permissive AND command='*'
        AND roles=ARRAY['safemove_clinical']::name[] AND using_expression=check_expression
    )),
    'indexes',(SELECT json_agg(i ORDER BY index_name) FROM actual_indexes i),
    'expected_5_indexes_ready',((SELECT count(*) FROM actual_indexes)=5 AND NOT EXISTS (
      SELECT 1 FROM expected_indexes e FULL JOIN actual_indexes a USING(index_name)
      WHERE e.index_name IS NULL OR a.index_name IS NULL OR NOT a.valid OR NOT a.ready OR NOT a.live
    )),
    'constraints',(SELECT json_agg(c ORDER BY table_name,constraint_name) FROM actual_constraints c),
    'expected_10_constraints_valid',((SELECT count(*) FROM actual_constraints)=10 AND NOT EXISTS (
      SELECT 1 FROM expected_constraints e FULL JOIN actual_constraints a USING(table_name,constraint_name)
      WHERE e.constraint_name IS NULL OR a.constraint_name IS NULL OR e.kind<>a.kind OR NOT a.validated
        OR (e.kind='f' AND (a.reference_table IS DISTINCT FROM e.reference_table OR a.delete_action<>'r' OR a.update_action<>'c'))
    ))
  ),
  'privileges',json_build_object(
    'roles',(SELECT json_agg(r ORDER BY role_name) FROM role_metadata r),
    'draft_direct_acl',coalesce((SELECT json_agg(json_build_object('grantee',coalesce(r.rolname,'PUBLIC'),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
      FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE c.oid=to_regclass('public.workout_drafts')),'[]'::json),
    'draft_effective_privileges',(SELECT json_agg(p ORDER BY role_name,privilege) FROM draft_privileges p),
    'clinical_crud_allowed',(SELECT count(*)=4 AND bool_and(allowed) FROM draft_privileges WHERE role_name='safemove_clinical' AND privilege IN ('SELECT','INSERT','UPDATE','DELETE')),
    'nonclinical_draft_denied',(SELECT count(*)=56 AND NOT bool_or(allowed) FROM draft_privileges WHERE role_name<>'safemove_clinical'),
    'checker_relation_grants',coalesce((SELECT json_agg(c ORDER BY schema_name,relation_name,privilege) FROM checker_relation_privileges c),'[]'::json),
    'checker_history_select_only',((SELECT count(*) FROM checker_relation_privileges)=1 AND EXISTS (
      SELECT 1 FROM checker_relation_privileges WHERE schema_name='public' AND relation_name='_prisma_migrations' AND privilege='SELECT'
    )),
    'checker_schema_privileges',(SELECT json_build_object(
      'public_usage',has_schema_privilege(r.oid,'public','USAGE'),
      'public_create',has_schema_privilege(r.oid,'public','CREATE'),
      'private_usage',has_schema_privilege(r.oid,'safemove_private','USAGE'),
      'private_create',has_schema_privilege(r.oid,'safemove_private','CREATE')
    ) FROM pg_roles r WHERE r.rolname='safemove_migration_check')
  )
);
