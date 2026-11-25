"use client"

import { useState } from "react"
import { isAxiosError } from "axios"
import { AlertTriangle, CheckCircle2, Package, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useDeletePhysioPackage,
  useUpdatePhysioPackage,
} from "@/hooks/features/usePhysioPackages"
import type { PhysioSessionPackageRecord } from "@/types/physio"

interface PhysioPackagesSectionProps {
  clientId: string
  packages: PhysioSessionPackageRecord[]
  isPending: boolean
  isError: boolean
  blocked: boolean
  onCreateNew: () => void
  onEdit: (pkg: PhysioSessionPackageRecord) => void
  onAccessDenied?: () => void
}

const STATUS_LABELS = {
  ACTIVE: "Ativo",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
} as const

export function PhysioPackagesSection({
  clientId,
  packages,
  isPending,
  isError,
  blocked,
  onCreateNew,
  onEdit,
  onAccessDenied,
}: PhysioPackagesSectionProps) {
  const updatePkg = useUpdatePhysioPackage(clientId)
  const deletePkg = useDeletePhysioPackage(clientId)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleComplete(pkg: PhysioSessionPackageRecord) {
    try {
      await updatePkg.mutateAsync({
        id: pkg.id,
        input: { status: "COMPLETED" },
      })
      toast.success("Pacote marcado como concluído.")
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        onAccessDenied?.()
        return
      }
      toast.error("Não foi possível concluir o pacote.")
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePkg.mutateAsync(id)
      setConfirmDeleteId(null)
      toast.success("Pacote removido.")
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        onAccessDenied?.()
        return
      }
      toast.error("Não foi possível excluir o pacote.")
    }
  }

  return (
    <section
      aria-labelledby="physio-packages-heading"
      className="min-w-0 space-y-4 border-t border-[var(--sm-border)] pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[var(--sm-brand)]" />
          <h3 id="physio-packages-heading" className="text-lg font-bold">
            Pacotes de sessões
          </h3>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={blocked}
          onClick={onCreateNew}
          className="min-h-11"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo pacote
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-[var(--sm-muted)]">
          Carregando pacotes de sessões...
        </p>
      ) : isError ? (
        <p className="text-sm text-rose-700">
          Não foi possível consultar os pacotes de sessões.
        </p>
      ) : packages.length === 0 ? (
        <p className="text-sm text-[var(--sm-muted)]">
          Nenhum pacote de sessões cadastrado para este paciente.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {packages.map(pkg => {
            const pct = Math.min(
              100,
              Math.round((pkg.completedSessions / Math.max(1, pkg.totalSessions)) * 100),
            )
            return (
              <article
                key={pkg.id}
                className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-bold text-[var(--sm-ink)]">
                        {pkg.title}
                      </h4>
                      <Badge
                        variant={pkg.status === "ACTIVE" ? "default" : "secondary"}
                      >
                        {STATUS_LABELS[pkg.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--sm-brand)]">
                      {pkg.progressLabel} · {pkg.remainingSessions}{" "}
                      {pkg.remainingSessions === 1 ? "restante" : "restantes"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={blocked}
                      aria-label={`Editar pacote ${pkg.title}`}
                      onClick={() => onEdit(pkg)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {pkg.status === "ACTIVE" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={blocked || updatePkg.isPending}
                        onClick={() => void handleComplete(pkg)}
                        className="h-8 text-xs"
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Concluir
                      </Button>
                    ) : null}
                    {confirmDeleteId === pkg.id ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={blocked || deletePkg.isPending}
                        onClick={() => void handleDelete(pkg.id)}
                        className="h-8 text-xs"
                      >
                        Confirmar exclusão do pacote
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={blocked}
                        aria-label={`Excluir pacote ${pkg.title}`}
                        onClick={() => setConfirmDeleteId(pkg.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-700" />
                      </Button>
                    )}
                  </div>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso de ${pkg.title}`}
                  className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    className="h-full rounded-full bg-purple-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">
                    {pkg.noShowCount}{" "}
                    {pkg.noShowCount === 1 ? "falta" : "faltas"}
                  </Badge>
                  <Badge variant="outline">
                    {pkg.cancelledCount}{" "}
                    {pkg.cancelledCount === 1 ? "cancelamento" : "cancelamentos"}
                  </Badge>
                  {pkg.reassessmentDue ? (
                    <Badge className="bg-amber-100 text-amber-900">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Reavaliação recomendada
                    </Badge>
                  ) : null}
                  {pkg.nearingEnd ? (
                    <Badge className="bg-rose-100 text-rose-800">
                      Pacote perto do fim
                    </Badge>
                  ) : null}
                </div>

                {pkg.notes ? (
                  <p className="text-xs text-[var(--sm-muted)]">{pkg.notes}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
