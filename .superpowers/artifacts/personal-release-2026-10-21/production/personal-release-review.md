# Scoped Personal release review

Spec: **PASS**
Quality: **APPROVED**
Findings: **0 critical, 0 high, 0 medium, 0 low**

Reviewed immutable range `66ff87b8b905dae14124cf658b878d831c76d9fa..bbef3e604cfe8d1da9a0b2a756b21d1fa7c13e5d`, including ordinary merge `25fdf65136fb8d517ba39ee5c65122b9cf9b38a4` of main/PR #29 (`677eb3df0e4104f290b25afa964647f0f28f3ba8`) and the operational SQL payload. This is an integration and release-artifact review; it does not reopen the two completed feature plans.

## Integration

- The new-workout route retains the completed `WorkoutDraftWorkspace`, including explicit manual creation, unsaved-text preservation through transient refresh failure, access-denial clearing/pinning, context ownership and draft guards. Upstream direct-save preservation tests were adapted to this manual-draft contract; unavailable active-workout copying remains blocked while an explicit blank draft remains supported.
- Upstream shared `ReauthenticateButton` and real logout/login recovery are retained in the affected existing surfaces. The draft workspace's existing logout recovery remains intact.
- `useCreateClientAssessment` and the dialog's mutation-only consumption exactly retain the upstream history fix: saving no longer registers a disabled history observer, and successful mutation invalidates the originating owner/client keys. Both draft separation and pending assessment-save regression cases survive the merge.
- Legacy `WorkoutEditor` context-unavailable submission and disabled-state guards survive alongside the completed demonstration-selection handling. Dashboard and hub changes retain draft navigation and the upstream reauthentication action.
- The API tree is unchanged from the reviewed base; the integration does not edit original schema/migrations, packages, CI or deployment configuration. Documentation preserves both prior chronology and the current release state.

## Migration artifact

Reviewed `docs/runbooks/sql/2026-10-21-personal-release.sql`, SHA-256 `b33220be20f5ea138d23cde2d3ca58a73266da50985ef0d87491921675e9e391`.

- Independently compared each extracted dynamic SQL body against its original versioned migration. All are identical after removing only the first migration's standalone transaction envelope. Original files are byte-identical to the pinned reviewed base. Each recorded checksum matches the complete original file, including that envelope.
- Independently compared all 19 expected history tuples against `/tmp/personal-release-production-baseline.json`; they match exactly. Existing historical checksums, including the documented completed tenant migration and rolled-back history, are preserved rather than rewritten.
- The single uncaught DO statement executes all real DDL before the three completed Prisma inserts. No transaction control or error swallowing breaks its atomicity. Actor/database, advisory transaction lock, history-table lock, unresolved failure, target-history, exact baseline, prerequisite and target-object guards fail closed before execution or roll back the whole statement.
- Reviewed the saved isolated verification results and logs: forced failure after DDL/history insertion rolled back to 19/zero target objects, success produced 22 with the expected checksums, replay was rejected, historical metadata was preserved, and the installed Prisma 7.10 CLI reported no pending migrations.
- The runbook correctly orders owner application and metadata/catalog/ACL read-back before main merge/autodeploy, retains restricted runtime credentials, and requires inspection of both histories and catalogs after any error/timeout before a retry decision.

## Evidence and limits

Reviewed the integration report and saved passing web/browser evidence: 87 files/666 tests and six specs/32 cases, plus the recorded type/lint/fresh-build proof. No tests, builds or probes were rerun for this review. Original API/PostgreSQL gates are retained by unchanged backend identity.

PostgreSQL 16 local versus PostgreSQL 17 production, undocumented hosted Supabase-history transaction boundaries, unobserved BFCache hits, the historical interrupted browser batch and earlier 31/32 batch are explicitly documented existing limits. They are not new integration defects. The DO provides application-DDL/Prisma atomicity independently; this approval does not claim a production migration or deployment has happened. Remote checks and post-application read-back remain the release executor's documented gates.

No concrete defect introduced by the integration or payload was found. No required corrections. Only this review report was written; no repository edits, database/network/production access, commits or remote actions were performed.
