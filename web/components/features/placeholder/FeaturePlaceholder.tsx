"use client"

import Link from "next/link"
import { ArrowLeft, Clock3, Sparkles, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeaturePlaceholderProps {
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  plannedCapabilities: string[]
}

export function FeaturePlaceholder({
  title,
  subtitle,
  description,
  icon: Icon,
  plannedCapabilities,
}: FeaturePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <header className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6 shadow-[var(--sm-shadow-rest)] sm:p-8">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-muted)] transition hover:bg-[var(--sm-surface-muted)] hover:text-[var(--sm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-brand)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para Visão geral
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-[var(--sm-radius-md)] bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]">
              <Icon className="size-6" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sm-brand)]">
                {subtitle}
              </p>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--sm-ink)] sm:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--sm-brand-border)] bg-[var(--sm-brand-subtle)] px-3.5 py-1.5 text-xs font-bold text-[var(--sm-brand)] sm:self-auto">
            <Clock3 className="size-3.5" />
            Em planejamento
          </span>
        </div>
      </header>

      {/* Main Content Card */}
      <div className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6 shadow-[var(--sm-shadow-rest)] sm:p-8">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 size-5 shrink-0 text-[var(--sm-brand)]" />
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[var(--sm-ink)]">
              Módulo mapeado na área profissional
            </h2>
            <p className="max-w-[70ch] text-sm leading-relaxed text-[var(--sm-muted)]">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--sm-border)] pt-6">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sm-brand)]">
            Funcionalidades planejadas
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {plannedCapabilities.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3.5 text-sm text-[var(--sm-ink)]"
              >
                <span className="mt-0.5 size-2 shrink-0 rounded-full bg-[var(--sm-brand)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[var(--sm-border)] pt-6">
          <p className="text-xs text-[var(--sm-muted)]">
            Pronto para refinamento e modelagem técnica.
          </p>
          <Link href="/clientes">
            <Button variant="outline" className="min-h-11">
              Ver base de clientes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
