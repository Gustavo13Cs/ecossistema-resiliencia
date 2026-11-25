"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { isAxiosError } from "axios"
import { Award, ClipboardSignature, FileCheck2, FileText } from "lucide-react"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { PhysioDischargeDialog } from "@/components/features/physio/PhysioDischargeDialog"
import { PhysioDischargeSection } from "@/components/features/physio/PhysioDischargeSection"
import { PhysioDocumentDialog } from "@/components/features/physio/PhysioDocumentDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { usePhysioAssessments } from "@/hooks/features/usePhysioAssessments"
import { usePhysioDischarges } from "@/hooks/features/usePhysioDischarges"
import { usePhysioEvolutions } from "@/hooks/features/usePhysioEvolutions"
import { usePhysioOverview } from "@/hooks/features/usePhysioOverview"
import type { PhysioDocumentType } from "@/types/physio"

export function PhysioDocumentsHub() {
  const { user } = useAuth()
  const isPhysio = Boolean(user?.sub && user.role === "PHYSIO")

  const activeClientsQuery = useClients("ACTIVE", { enabled: isPhysio })
  const archivedClientsQuery = useClients("ARCHIVED", { enabled: isPhysio })

  const allClients = useMemo(
    () => [
      ...(activeClientsQuery.data ?? []),
      ...(archivedClientsQuery.data ?? []),
    ],
    [activeClientsQuery.data, archivedClientsQuery.data],
  )

  const [selectedClientId, setSelectedClientId] = useState("")
  const [docOpen, setDocOpen] = useState(false)
  const [docTab, setDocTab] = useState<PhysioDocumentType>("ATTENDANCE")
  const [dischargeOpen, setDischargeOpen] = useState(false)
  const [denied, setDenied] = useState(false)

  const effectiveClientId = selectedClientId || allClients[0]?.id || ""
  const selectedClient = allClients.find((c) => c.id === effectiveClientId)
  const isArchived = selectedClient?.status === "ARCHIVED"

  const overview = usePhysioOverview(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })
  const assessments = usePhysioAssessments(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })
  const evolutions = usePhysioEvolutions(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })
  const discharges = usePhysioDischarges(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })

  const accessDenied =
    denied ||
    [
      activeClientsQuery.error,
      archivedClientsQuery.error,
      overview.error,
      assessments.error,
      evolutions.error,
      discharges.error,
    ].some(
      (err) => isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0),
    )

  if (!isPhysio) return null

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar os documentos clínicos."
          action={<ReauthenticateButton />}
        />
      </div>
    )
  }

  function openDocument(tab: PhysioDocumentType) {
    setDocTab(tab)
    setDocOpen(true)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-[var(--sm-border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
          Fisioterapia · Emissão COFFITO A4 e encerramento
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
          <FileText className="h-6 w-6 text-[var(--sm-brand)]" />
          Documentos Clínicos & Altas
        </h1>
        <p className="mt-1 text-sm text-[var(--sm-muted)]">
          Emita Declaração de Comparecimento, Atestado Fisioterapêutico, Relatório Médico/Convênio e Relatório de Alta comparativo em PDF A4.
        </p>
      </header>

      {activeClientsQuery.isPending ? (
        <AsyncState
          kind="loading"
          title="Carregando pacientes..."
          description="Preparando a emissão de documentos clínicos."
        />
      ) : allClients.length === 0 ? (
        <AsyncState
          kind="empty"
          title="Nenhum paciente cadastrado"
          description="Cadastre um paciente para emitir declarações, atestados, relatórios e altas."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <div className="min-w-[240px] flex-1">
              <label
                htmlFor="physio-documents-client-select"
                className="block text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]"
              >
                Paciente selecionado
              </label>
              <select
                id="physio-documents-client-select"
                value={effectiveClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)]"
              >
                {allClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.status === "ARCHIVED" ? " (Arquivado)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {isArchived ? <Badge variant="secondary">Arquivado</Badge> : null}
              <Link
                href={`/clientes/${effectiveClientId}`}
                className="inline-flex min-h-11 items-center rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"
              >
                Abrir prontuário
              </Link>
            </div>
          </div>

          <section
            aria-label="Emissão rápida de documentos PDF A4"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <article className="flex flex-col justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-[var(--sm-ink)]">
                  <FileCheck2 className="h-4 w-4 text-[var(--sm-brand)]" />
                  Declaração de Comparecimento
                </h2>
                <p className="mt-1 text-xs text-[var(--sm-muted)]">
                  Comprovante de presença em atendimento com data, horário e acompanhante opcional.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => openDocument("ATTENDANCE")}
                className="min-h-10 w-full"
              >
                Emitir declaração
              </Button>
            </article>

            <article className="flex flex-col justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-[var(--sm-ink)]">
                  <ClipboardSignature className="h-4 w-4 text-[var(--sm-brand)]" />
                  Atestado Fisioterapêutico
                </h2>
                <p className="mt-1 text-xs text-[var(--sm-muted)]">
                  Parecer cinético-funcional COFFITO com opção de privacidade para CID/diagnóstico.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => openDocument("CERTIFICATE")}
                className="min-h-10 w-full"
              >
                Emitir atestado
              </Button>
            </article>

            <article className="flex flex-col justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-[var(--sm-ink)]">
                  <FileText className="h-4 w-4 text-[var(--sm-brand)]" />
                  Relatório Médico / Convênio
                </h2>
                <p className="mt-1 text-xs text-[var(--sm-muted)]">
                  Síntese clínica com evolução de EVA, medidas de ADM, escalas e parecer técnico.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => openDocument("MEDICAL_REPORT")}
                className="min-h-10 w-full"
              >
                Emitir relatório
              </Button>
            </article>

            <article className="flex flex-col justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-[var(--sm-ink)]">
                  <Award className="h-4 w-4 text-[var(--sm-brand)]" />
                  Alta Fisioterapêutica
                </h2>
                <p className="mt-1 text-xs text-[var(--sm-muted)]">
                  Comparativo Inicial vs. Alta (EVA, goniometria e escalas) e encerramento de ciclo.
                </p>
              </div>
              <Button
                type="button"
                disabled={isArchived}
                onClick={() => setDischargeOpen(true)}
                className="min-h-10 w-full"
              >
                Registrar alta
              </Button>
            </article>
          </section>

          <PhysioDischargeSection
            clientId={effectiveClientId}
            clientName={selectedClient?.name ?? "Paciente"}
            discharges={discharges.discharges}
            isPending={discharges.isPending}
            isError={Boolean(discharges.error)}
            blocked={isArchived}
            onRegisterNew={() => setDischargeOpen(true)}
            onAccessDenied={() => setDenied(true)}
          />
        </>
      )}

      {docOpen && selectedClient ? (
        <PhysioDocumentDialog
          open={true}
          onOpenChange={setDocOpen}
          clientName={selectedClient.name}
          assessments={assessments.assessments}
          evolutions={evolutions.evolutions}
          scales={overview.data?.recentScales ?? []}
          activePlan={overview.data?.activePlan ?? null}
          appointments={overview.data?.unlinkedAppointments ?? []}
          defaultTab={docTab}
        />
      ) : null}

      {dischargeOpen && selectedClient && !isArchived ? (
        <PhysioDischargeDialog
          open={true}
          onOpenChange={setDischargeOpen}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          assessments={assessments.assessments}
          evolutionsCount={evolutions.evolutions.length}
          activePlan={overview.data?.activePlan ?? null}
          activePackage={overview.data?.activePackage ?? null}
          onAccessDenied={() => setDenied(true)}
        />
      ) : null}
    </div>
  )
}
