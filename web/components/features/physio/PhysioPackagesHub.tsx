"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { isAxiosError } from "axios"
import { AlertTriangle, CheckCircle2, Package, Users } from "lucide-react"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { PhysioPackageDialog } from "@/components/features/physio/PhysioPackageDialog"
import { PhysioPackagesSection } from "@/components/features/physio/PhysioPackagesSection"
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
import { useClients } from "@/hooks/features/useClients"
import { usePhysioManagementReport } from "@/hooks/features/usePhysioDischarges"
import { usePhysioPackages } from "@/hooks/features/usePhysioPackages"
import { usePhysioWorkspace } from "@/hooks/features/usePhysioWorkspace"
import type { PhysioSessionPackageRecord } from "@/types/physio"

export function PhysioPackagesHub() {
  const { user } = useAuth()
  const isPhysio = Boolean(user?.sub && user.role === "PHYSIO")

  const reportQuery = usePhysioManagementReport("90_DAYS")
  const workspace = usePhysioWorkspace()
  const clientsQuery = useClients("ACTIVE", { enabled: isPhysio })

  const activeClients = useMemo(
    () => clientsQuery.data ?? [],
    [clientsQuery.data],
  )
  const expiringClientIds = useMemo(
    () =>
      new Set(
        (workspace.data?.items ?? [])
          .filter((i) => i.section === "EXPIRING_PACKAGE")
          .map((i) => i.clientId),
      ),
    [workspace.data?.items],
  )

  const [selectedClientId, setSelectedClientId] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] =
    useState<PhysioSessionPackageRecord | null>(null)
  const [denied, setDenied] = useState(false)

  const defaultClientId =
    reportQuery.data?.items.find((i) => i.activePackageTitle)?.clientId ??
    activeClients[0]?.id ??
    ""

  const effectiveClientId = selectedClientId || defaultClientId
  const selectedClientName =
    activeClients.find((c) => c.id === effectiveClientId)?.name ??
    reportQuery.data?.items.find((i) => i.clientId === effectiveClientId)?.name ??
    "Paciente"

  const packagesQuery = usePhysioPackages(effectiveClientId || undefined, {
    enabled: Boolean(isPhysio && effectiveClientId),
  })

  const accessDenied =
    denied ||
    [reportQuery.error, clientsQuery.error, packagesQuery.error].some(
      (err) => isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0),
    )

  if (!isPhysio) return null

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar os pacotes de sessões."
          action={<ReauthenticateButton />}
        />
      </div>
    )
  }

  const counts = reportQuery.data?.counts
  const itemsWithPackagesOrActivity = reportQuery.data?.items ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
            Fisioterapia · Planos de sessões e renovação
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
            <Package className="h-6 w-6 text-[var(--sm-brand)]" />
            Pacotes de Sessões
          </h1>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Acompanhe sessões realizadas, faltas, cancelamentos e alertas automáticos de renovação ou reavaliação.
          </p>
        </div>

        {effectiveClientId ? (
          <Button
            type="button"
            onClick={() => {
              setEditingPackage(null)
              setDialogOpen(true)
            }}
            className="min-h-11"
          >
            Novo pacote para {selectedClientName}
          </Button>
        ) : null}
      </header>

      {counts ? (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <Package className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Pacotes ativos
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums">
              {counts.activePackagesCount}
            </dd>
          </div>
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Pacotes perto do fim
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums">
              {counts.expiringPackagesCount}
            </dd>
          </div>
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Sessões (90 dias)
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums">
              {counts.completedSessions}
            </dd>
          </div>
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
              <Users className="h-3.5 w-3.5 text-[var(--sm-brand)]" />
              Faltas no período
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tabular-nums">
              {counts.noShowCount}
            </dd>
          </div>
        </dl>
      ) : null}

      <section
        aria-labelledby="packages-overview-table"
        className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
      >
        <h2 id="packages-overview-table" className="text-lg font-bold">
          Visão geral dos pacotes por paciente
        </h2>
        {reportQuery.isPending ? (
          <p className="mt-3 text-sm text-[var(--sm-muted)]">
            Carregando panorama de pacotes...
          </p>
        ) : itemsWithPackagesOrActivity.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sm-muted)]">
            Nenhuma movimentação registrada ainda. Selecione um paciente abaixo para criar o primeiro pacote.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Pacote ativo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Faltas / Cancel.</TableHead>
                  <TableHead className="text-right">Gerenciar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithPackagesOrActivity.map((item) => {
                  const isExpiring = expiringClientIds.has(item.clientId)
                  return (
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{item.activePackageTitle ?? "Sem pacote ativo"}</span>
                          {isExpiring ? (
                            <Badge className="bg-rose-100 text-rose-800">
                              Perto do fim
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {item.packageTotalSessions != null
                          ? `${item.packageCompletedSessions ?? 0}/${item.packageTotalSessions}`
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {item.noShowCount} / {item.cancelledCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant={
                            effectiveClientId === item.clientId
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedClientId(item.clientId)}
                        >
                          Ver pacotes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {activeClients.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
            <div className="min-w-[240px] flex-1">
              <label
                htmlFor="physio-packages-client-select"
                className="block text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]"
              >
                Gerenciar pacotes do paciente
              </label>
              <select
                id="physio-packages-client-select"
                value={effectiveClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)]"
              >
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href={`/clientes/${effectiveClientId}`}
              className="inline-flex min-h-11 items-center rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"
            >
              Abrir prontuário
            </Link>
          </div>

          {effectiveClientId ? (
            <PhysioPackagesSection
              clientId={effectiveClientId}
              packages={packagesQuery.packages}
              isPending={packagesQuery.isPending}
              isError={Boolean(packagesQuery.error)}
              blocked={false}
              onCreateNew={() => {
                setEditingPackage(null)
                setDialogOpen(true)
              }}
              onEdit={(pkg) => {
                setEditingPackage(pkg)
                setDialogOpen(true)
              }}
              onAccessDenied={() => setDenied(true)}
            />
          ) : null}
        </div>
      ) : null}

      {dialogOpen && effectiveClientId ? (
        <PhysioPackageDialog
          open={true}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingPackage(null)
          }}
          clientId={effectiveClientId}
          clientName={selectedClientName}
          editingPackage={editingPackage}
          onAccessDenied={() => setDenied(true)}
        />
      ) : null}
    </div>
  )
}
