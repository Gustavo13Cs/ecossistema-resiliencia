"use client"

import { useState } from "react"
import { Search, TrendingDown, TrendingUp, Minus, ChevronRight, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { ClientEvolution } from "@/hooks/features/useEvolution"

interface ClientEvolutionListProps {
  clientEvolutions: ClientEvolution[]
  selectedClientId: string | null
  onSelectClient: (clientId: string) => void
}

function DeltaBadge({ value, unit, invertColor }: { value: number | null; unit: string; invertColor?: boolean }) {
  if (value == null) return <span className="text-xs text-[var(--sm-muted)]">—</span>

  const isPositive = value > 0
  const isZero = value === 0
  const color = isZero
    ? "text-[var(--sm-muted)]"
    : invertColor
      ? isPositive ? "text-rose-600" : "text-emerald-600"
      : isPositive ? "text-emerald-600" : "text-rose-600"

  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
      <Icon className="size-3" />
      {value > 0 ? "+" : ""}{value}{unit}
    </span>
  )
}

export function ClientEvolutionList({
  clientEvolutions,
  selectedClientId,
  onSelectClient,
}: ClientEvolutionListProps) {
  const [search, setSearch] = useState("")

  const filtered = clientEvolutions.filter((c) =>
    c.clientName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)] overflow-hidden">
      {/* Header + Search */}
      <div className="border-b border-[var(--sm-border)] bg-[var(--sm-canvas)] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-[var(--sm-brand)]" strokeWidth={1.8} />
            <h2 className="text-base font-bold text-[var(--sm-ink)]">
              Evolução por Cliente
            </h2>
            <span className="rounded-full bg-[var(--sm-brand-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--sm-brand)]">
              {filtered.length}
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" />
            <Input
              aria-label="Buscar cliente"
              placeholder="Buscar pelo nome..."
              className="h-9 pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-[var(--sm-border)]">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--sm-muted)]">
            {search ? "Nenhum cliente encontrado." : "Nenhum cliente com avaliações registradas."}
          </div>
        ) : (
          filtered.map((evolution) => {
            const isSelected = selectedClientId === evolution.clientId
            return (
              <button
                key={evolution.clientId}
                type="button"
                onClick={() => onSelectClient(evolution.clientId)}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--sm-subtle-hover)] ${
                  isSelected ? "bg-[var(--sm-brand-subtle)] border-l-2 border-l-[var(--sm-brand)]" : ""
                }`}
              >
                {/* Avatar */}
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--sm-brand-subtle)] text-sm font-bold text-[var(--sm-brand)]">
                  {evolution.clientName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-[var(--sm-ink)]">
                      {evolution.clientName}
                    </p>
                    <span className="shrink-0 rounded-full bg-[var(--sm-canvas)] px-2 py-0.5 text-[10px] font-bold text-[var(--sm-muted)]">
                      {evolution.assessmentCount} {evolution.assessmentCount === 1 ? "avaliação" : "avaliações"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {/* Weight */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--sm-muted)]">Peso:</span>
                      <span className="text-xs font-bold text-[var(--sm-ink)]">
                        {evolution.lastWeight != null ? `${evolution.lastWeight} kg` : "—"}
                      </span>
                      {evolution.assessmentCount > 1 && (
                        <DeltaBadge value={evolution.weightDelta} unit=" kg" />
                      )}
                    </div>
                    {/* Body Fat */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--sm-muted)]">Gordura:</span>
                      <span className="text-xs font-bold text-[var(--sm-ink)]">
                        {evolution.lastBodyFat != null ? `${evolution.lastBodyFat}%` : "—"}
                      </span>
                      {evolution.assessmentCount > 1 && (
                        <DeltaBadge value={evolution.bodyFatDelta} unit="%" invertColor />
                      )}
                    </div>
                    {/* Muscle */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--sm-muted)]">Músculo:</span>
                      <span className="text-xs font-bold text-[var(--sm-ink)]">
                        {evolution.lastMuscleMass != null ? `${evolution.lastMuscleMass} kg` : "—"}
                      </span>
                      {evolution.assessmentCount > 1 && (
                        <DeltaBadge value={evolution.muscleMassDelta} unit=" kg" />
                      )}
                    </div>
                    {/* Last date */}
                    <span className="text-[10px] text-[var(--sm-muted)]">
                      Última: {new Date(evolution.lastDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight
                  className={`size-4 shrink-0 transition-transform ${
                    isSelected ? "rotate-90 text-[var(--sm-brand)]" : "text-[var(--sm-muted)]"
                  }`}
                />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
