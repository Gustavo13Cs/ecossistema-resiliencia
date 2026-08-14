-- CreateEnum
CREATE TYPE "AgendaTaskCategory" AS ENUM ('NUTRITION', 'TRAINING', 'REHABILITATION', 'SUPPLEMENT', 'HYDRATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AgendaTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "AgendaTaskStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "AgendaOccurrenceStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentCategory" AS ENUM ('GENERAL', 'NUTRITION', 'TRAINING', 'REHABILITATION', 'HEALTH_CHECK_IN');

-- CreateTable
CREATE TABLE "agenda_tasks" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "AgendaTaskCategory" NOT NULL,
    "instructions" TEXT,
    "priority" "AgendaTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "timeZone" TEXT NOT NULL,
    "recurrenceRule" TEXT,
    "status" "AgendaTaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_task_occurrences" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "AgendaOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "patientNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_task_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dataCategory" "ConsentCategory" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_ins" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waterMl" INTEGER,
    "painLevel" INTEGER,
    "mood" INTEGER,
    "symptoms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_tasks_patientId_status_idx" ON "agenda_tasks"("patientId", "status");

-- CreateIndex
CREATE INDEX "agenda_tasks_professionalId_status_idx" ON "agenda_tasks"("professionalId", "status");

-- CreateIndex
CREATE INDEX "agenda_task_occurrences_patientId_scheduledFor_status_idx" ON "agenda_task_occurrences"("patientId", "scheduledFor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_task_occurrences_taskId_scheduledFor_key" ON "agenda_task_occurrences"("taskId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consents_patientId_professionalId_dataCategory_key" ON "patient_consents"("patientId", "professionalId", "dataCategory");

-- CreateIndex
CREATE INDEX "health_check_ins_patientId_recordedAt_idx" ON "health_check_ins"("patientId", "recordedAt");

-- AddForeignKey
ALTER TABLE "agenda_tasks" ADD CONSTRAINT "agenda_tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_tasks" ADD CONSTRAINT "agenda_tasks_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_task_occurrences" ADD CONSTRAINT "agenda_task_occurrences_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "agenda_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_task_occurrences" ADD CONSTRAINT "agenda_task_occurrences_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_check_ins" ADD CONSTRAINT "health_check_ins_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
