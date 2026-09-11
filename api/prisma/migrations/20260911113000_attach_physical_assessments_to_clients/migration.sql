-- AttachPhysicalAssessmentsToClients
-- New assessments belong to the authenticated professional's private Client.
-- The nullable User relation is retained temporarily for legacy records.
-- Legacy assessments are intentionally not backfilled: they do not record the
-- authoring professional, so choosing one of several links would risk assigning
-- clinical data to the wrong private Client.

ALTER TABLE "physical_assessments" ADD COLUMN "clientId" TEXT;
ALTER TABLE "physical_assessments" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "physical_assessments"
  ADD CONSTRAINT "physical_assessments_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "physical_assessments"
  ADD CONSTRAINT "physical_assessments_subject_check"
  CHECK ("clientId" IS NOT NULL OR "userId" IS NOT NULL);

CREATE INDEX "physical_assessments_clientId_date_idx"
  ON "physical_assessments"("clientId", "date");
