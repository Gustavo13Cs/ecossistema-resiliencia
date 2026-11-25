"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Printer, Search } from "lucide-react"
import { AsyncState } from "@/components/feedback/AsyncState"
import { RehabPrintDialog } from "@/components/features/physio/RehabPrintDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { useFisio } from "@/hooks/features/useFisio"
import { usePhysioExerciseCatalog } from "@/hooks/features/useRehabCatalog"
import { isExerciseMediaUrl } from "@/lib/exercise-media-policy"
import {
  EXERCISE_EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_OPTIONS,
  type ExerciseEquipment,
} from "@/types/workout"

export function RehabExercisesHub() {
  const { user } = useAuth()
  const isPhysio = Boolean(user?.sub && user.role === "PHYSIO")

  const [search, setSearch] = useState("")
  const [muscleGroup, setMuscleGroup] = useState("ALL")
  const [onlyWithIllustration, setOnlyWithIllustration] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [printOpen, setPrintOpen] = useState(false)

  const clientsQuery = useClients("ACTIVE", { enabled: isPhysio })
  const activeClients = clientsQuery.data ?? []
  const effectiveClientId = selectedClientId || activeClients[0]?.id || ""
  const selectedClient = activeClients.find((c) => c.id === effectiveClientId)

  const catalogQuery = usePhysioExerciseCatalog(
    { q: search, muscleGroup, onlyWithIllustration },
    isPhysio,
  )
  const activeRehab = useFisio(effectiveClientId || undefined)

  if (!isPhysio) return null

  const items = catalogQuery.data ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
            Fisioterapia · Biblioteca e cartilha domiciliar
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
            <BookOpen className="h-6 w-6 text-[var(--sm-brand)]" />
            Biblioteca Visual de Exercícios
          </h1>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Consulte exercícios com ilustrações anatômicas SafeMove para orientações presenciais e cartilhas de casa em PDF A4.
          </p>
        </div>
      </header>

      {activeClients.length > 0 ? (
        <section
          aria-label="Atalho de cartilha por paciente"
          className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
        >
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="rehab-exercises-client-select"
              className="block text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]"
            >
              Paciente para prescrição ou cartilha PDF
            </label>
            <select
              id="rehab-exercises-client-select"
              value={effectiveClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)]"
            >
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeRehab.rehabPlan ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPrintOpen(true)}
                className="min-h-11"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimir Cartilha para Casa (PDF A4)
              </Button>
            ) : null}
            {effectiveClientId ? (
              <Link
                href={`/clientes/${effectiveClientId}/nova-reabilitacao`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2 text-sm font-bold text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
              >
                Prescrever / editar protocolo
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--sm-muted)]" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar exercício (ex: Dead bug, Ponte, Prancha)..."
            aria-label="Buscar exercício na biblioteca visual"
            className="min-h-11 pl-9"
          />
        </div>

        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          aria-label="Filtrar por grupo muscular"
          className="min-h-11 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 py-2 text-sm"
        >
          <option value="ALL">Todos os grupos musculares</option>
          {MUSCLE_GROUP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 py-2.5 text-sm font-medium">
          <input
            type="checkbox"
            checked={onlyWithIllustration}
            onChange={(e) => setOnlyWithIllustration(e.target.checked)}
            className="h-4 w-4 accent-[var(--sm-brand)]"
          />
          <span>Apenas exercícios ilustrados para cartilha</span>
        </label>
      </div>

      {catalogQuery.isPending ? (
        <AsyncState
          kind="loading"
          title="Carregando biblioteca visual..."
          description="Buscando exercícios e ilustrações anatômicas."
        />
      ) : catalogQuery.error ? (
        <AsyncState
          kind="error"
          title="Biblioteca indisponível"
          description="Não foi possível carregar o catálogo de exercícios."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => void catalogQuery.refetch()}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <AsyncState
          kind="empty"
          title="Nenhum exercício encontrado"
          description="Altere os filtros de busca ou grupo muscular para ver outros exercícios."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const asset =
              item.demonstration?.assets?.find(
                (candidate) =>
                  candidate.type === "IMAGE" &&
                  candidate.displayAllowed === true &&
                  isExerciseMediaUrl(candidate.url),
              ) ?? null

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
              >
                <div className="space-y-2.5">
                  {asset ? (
                    <figure className="space-y-1">
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-slate-800 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.alt || item.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <figcaption className="text-[11px] text-[var(--sm-muted)]">
                        {asset.author} · {asset.licenseName}
                      </figcaption>
                    </figure>
                  ) : null}

                  <div>
                    <h2 className="font-bold text-[var(--sm-ink)]">
                      {item.name}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {MUSCLE_GROUP_LABELS[item.muscleGroup] ??
                          item.muscleGroup}
                      </Badge>
                      <Badge variant="outline">
                        {EXERCISE_EQUIPMENT_LABELS[
                          item.equipment as ExerciseEquipment
                        ] ?? item.equipment}
                      </Badge>
                      {item.hasIllustration ? (
                        <Badge variant="outline">Com ilustração</Badge>
                      ) : null}
                    </div>
                  </div>

                  {item.demonstration?.instruction ? (
                    <p className="text-xs text-[var(--sm-muted)]">
                      {item.demonstration.instruction}
                    </p>
                  ) : item.notes ? (
                    <p className="text-xs text-[var(--sm-muted)]">{item.notes}</p>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {printOpen && activeRehab.rehabPlan ? (
        <RehabPrintDialog
          open={true}
          plan={activeRehab.rehabPlan}
          patientName={selectedClient?.name ?? "Paciente"}
          defaultMode="home-program"
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
    </div>
  )
}
