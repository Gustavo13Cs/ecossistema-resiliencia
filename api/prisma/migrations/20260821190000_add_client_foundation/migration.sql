-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientAuditAction" AS ENUM ('CREATED', 'UPDATED', 'ARCHIVED', 'RESTORED');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "goal" TEXT,
    "height" DOUBLE PRECISION,
    "initialWeight" DOUBLE PRECISION,
    "allergies" TEXT,
    "pathologies" TEXT,
    "typicalSleep" TEXT,
    "stressLevel" INTEGER,
    "foodRelationship" TEXT,
    "psychologyHistory" TEXT,
    "exerciseType" TEXT,
    "exerciseFrequency" TEXT,
    "exerciseDuration" TEXT,
    "hasPersonal" TEXT,
    "workActivityLevel" TEXT,
    "professionalNotes" TEXT,
    "privacyNotes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_audit_events" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "action" "ClientAuditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_professionalId_email_key" ON "clients"("professionalId", "email");

-- CreateIndex
CREATE INDEX "clients_professionalId_status_createdAt_idx" ON "clients"("professionalId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "client_audit_events_professionalId_clientId_createdAt_idx" ON "client_audit_events"("professionalId", "clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_audit_events" ADD CONSTRAINT "client_audit_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_audit_events" ADD CONSTRAINT "client_audit_events_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
