"use client"

import { useState } from "react"
import Link from "next/link"
import { isAxiosError } from "axios"
import {
  Activity,
  Award,
  BarChart3,
  Download,
  Package,
  Printer,
  RefreshCw,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import { usePhysioManagementReport } from "@/hooks/features/usePhysioDischarges"
import { PHYSIO_DISCHARGE_REASON_LABELS } from "@/lib/physio-documents-print"
import {
  PHYSIO_REPORT_PERIOD_LABELS,
  buildPhysioManagementCsv,
  buildPhysioManagementReportPrintHtml,
} from "@/lib/physio-reports-print"
import { openPrintWindow } from "@/lib/print-document"
import type { PhysioDischargeReason, PhysioReportPeriod } from "@/types/physio"

const PERIOD_OPTIONS: PhysioReportPeriod[] = [
  "30_DAYS",
  "90_DAYS",
  "180_DAYS",
  "365_DAYS",
]

function formatShortDate(iso: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date)
}

export function PhysioManagementReportsView() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<PhysioReportPeriod>("90_DAYS")
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const reportQuery = usePhysioManagementReport(period)

  const denied =
    isAxiosError(reportQuery.error) &&
    [401, 403].includes(reportQuery.error.response?.status ?? 0)

  if (denied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar os relatórios de fisioterapia."
          action={<ReauthenticateButton />}
        />
      </div>
    )
  }

  if (reportQuery.isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="loading"
          title="Gerando relatório gerencial de fisioterapia..."
          description="Consolidando sessões, pacotes, evolução álgica e altas do período."
        />
      </div>
    )
  }

  if (reportQuery.error || !reportQuery.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Relatório indisponível"
          description="Não foi possível carregar os indicadores gerenciais de fisioterapia."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => void reportQuery.refetch()}
              className="min-h-11"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          }
        />
      </div>
    )
  }

  const report = reportQuery.data
  const c = report.counts
  const reasonEntries = Object.entries(report.dischargesByReason) as Array<
    [PhysioDischargeReason, number]
  >

  function handleExportCsv() {
    setIsExportingCsv(true)
    try {
      const csv = buildPhysioManagementCsv(report)
      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `relatorio-fisioterapia-${period.toLowerCase()}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      toast.success("CSV exportado com sucesso.")
    } catch {
      toast.error("Não foi possível exportar o arquivo CSV.")
    } finally {
      setIsExportingCsv(false)
    }
  }

  function handleExportPdf() {
    const dateLabel = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date())
    const html = buildPhysioManagementReportPrintHtml({
      report,
      professionalName: user?.name ?? null,
      dateLabel,
    })
    const popup = openPrintWindow(html, "width=1024,height=780")
    if (!popup) {
      toast.error("Libere pop-ups para imprimir ou salvar o relatório em PDF.")
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
            Fisioterapia · Gestão da clínica
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
            <BarChart3 className="h-6 w-6 text-[var(--sm-brand)]" />
            Relatórios Gerenciais
          </h1>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Frequência, adesão a pacotes de sessões, evolução de dor e altas clínicas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="physio-report-period" className="sr-only">
            Período do relatório
          </label>
          <select
            id="physio-report-period"
            aria-label="Período do relatório"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PhysioReportPeriod)}
            className="min-h-11 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 py-2 text-sm font-semibold text-[var(--sm-ink)]"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {PHYSIO_REPORT_PERIOD_LABELS[opt]}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            disabled={isExportingCsv}
            onClick={handleExportCsv}
            className="min-h-11"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            type="button"
            onClick={handleExportPdf}
            className="min-h-11"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </header>

      <section aria-label="Indicadores de desempenho clínico">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <Activity className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Sessões realizadas
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--sm-ink)]">
              {c.completedSessions}
            </dd>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">
              {c.completedAppointments} atendimentos concluídos
            </p>
          </div>

          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              Comparecimento
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--sm-ink)]">
              {c.attendanceRatePct}%
            </dd>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">
              {c.noShowCount} faltas · {c.cancelledCount} cancelamentos
            </p>
          </div>

          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <Package className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Pacotes ativos
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--sm-ink)]">
              {c.activePackagesCount}
            </dd>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">
              {c.expiringPackagesCount} perto do fim
            </p>
          </div>

          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              Redução média EVA
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--sm-ink)]">
              {c.avgPainReduction != null
                ? `${c.avgPainReduction >= 0 ? "-" : "+"}${Math.abs(c.avgPainReduction)} pts`
                : "—"}
            </dd>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">
              Entre início e alta
            </p>
          </div>

          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <Award className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Altas no período
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--sm-ink)]">
              {c.dischargesCount}
            </dd>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">
              Média:{" "}
              {c.avgSessionsToDischarge != null
                ? `${c.avgSessionsToDischarge} sessões`
                : "—"}
            </p>
          </div>

          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <Users className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Base de pacientes
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--sm-ink)]">
              {c.activePatients}
            </dd>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">
              {c.archivedPatients} arquivados
            </p>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="physio-discharges-summary-heading"
        className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
      >
        <h2
          id="physio-discharges-summary-heading"
          className="text-lg font-bold text-[var(--sm-ink)]"
        >
          Desfechos e motivos de alta
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reasonEntries.map(([reason, count]) => (
            <div
              key={reason}
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3"
            >
              <p className="text-xs font-semibold text-[var(--sm-muted)]">
                {PHYSIO_DISCHARGE_REASON_LABELS[reason]}
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-[var(--sm-ink)]">
                {count}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="physio-patients-report-heading"
        className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
      >
        <h2
          id="physio-patients-report-heading"
          className="text-lg font-bold text-[var(--sm-ink)]"
        >
          Adesão por paciente e pacotes de sessões
        </h2>
        {report.items.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sm-muted)]">
            Nenhuma movimentação clínica registrada neste período.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sessões</TableHead>
                  <TableHead>Faltas</TableHead>
                  <TableHead>Cancelamentos</TableHead>
                  <TableHead>Pacote ativo</TableHead>
                  <TableHead>Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((item) => (
                  <TableRow key={item.clientId}>
                    <TableCell className="font-semibold">
                      <Link
                        href={`/clientes/${item.clientId}`}
                        className="text-[var(--sm-brand)] hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {item.status === "ACTIVE" ? "Ativo" : "Arquivado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.completedSessions}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.noShowCount}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.cancelledCount}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {item.activePackageTitle
                        ? `${item.activePackageTitle} (${item.packageCompletedSessions ?? 0}/${item.packageTotalSessions ?? 0})`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {item.latestDischargeReason ? (
                        <span className="text-xs font-medium">
                          {PHYSIO_DISCHARGE_REASON_LABELS[item.latestDischargeReason]}{" "}
                          · {formatShortDate(item.dischargedAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
