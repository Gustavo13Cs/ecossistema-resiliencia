"use client"

import { AlertTriangle, TrendingDown, Clock, Droplet, MessageSquare, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { GoalAlert } from "@/types/goal"

interface GoalAlertsSectionProps {
  alerts: GoalAlert[]
  onOpenClientDetails?: (clientId: string) => void
}

const ALERT_TYPE_CONFIG = {
  REGRESSION: {
    badge: "Regressão de Meta",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    icon: TrendingDown,
    border: "border-rose-300 dark:border-rose-900/60",
  },
  PLATEAU: {
    badge: "Platô Prolongado",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    icon: Clock,
    border: "border-amber-300 dark:border-amber-900/60",
  },
  DEADLINE_CRITICAL: {
    badge: "Prazo Crítico",
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
    icon: AlertTriangle,
    border: "border-red-300 dark:border-red-900/60",
  },
  HABIT_DEFICIT: {
    badge: "Adesão Insuficiente",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
    icon: Droplet,
    border: "border-orange-300 dark:border-orange-900/60",
  },
}

export function GoalAlertsSection({ alerts, onOpenClientDetails }: GoalAlertsSectionProps) {
  if (alerts.length === 0) {
    return (
      <Card className="border border-dashed border-[var(--sm-border)] bg-[var(--sm-surface)] p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-[var(--sm-ink)]">Nenhum cliente em risco ou alerta clínico</h3>
        <p className="mt-1 text-xs text-[var(--sm-muted)]">
          Todos os clientes com metas ativas estão progredindo dentro do ritmo previsto e com adesão satisfatória aos hábitos.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--sm-ink)]">
            Clientes Distantes do Objetivo Pactuado ({alerts.length})
          </h3>
          <p className="text-xs text-[var(--sm-muted)]">
            Identificação proativa de desvios, platôs metabólicos e déficit de adesão para intervenção oportuna.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {alerts.map((alert) => {
          const config = ALERT_TYPE_CONFIG[alert.type] || ALERT_TYPE_CONFIG.PLATEAU
          const Icon = config.icon

          // Clean phone for whatsapp
          const rawPhone = alert.clientPhone?.replace(/\D/g, "")
          const whatsappUrl =
            rawPhone && rawPhone.length >= 10
              ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(alert.suggestedWhatsAppMessage)}`
              : null

          return (
            <Card
              key={alert.id}
              className={`border bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)] transition hover:shadow-md ${config.border}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeColor}`}>
                      <Icon className="size-3.5" />
                      {config.badge}
                    </span>
                    {alert.severity === "HIGH" && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        Alta Prioridade
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--sm-ink)]">{alert.clientName}</span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-[var(--sm-ink)]">{alert.title}</h4>
                  <p className="mt-1 text-xs text-[var(--sm-muted)] leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                <div className="mt-3 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3 text-xs">
                  <strong className="text-[var(--sm-ink)]">Conduta Recomendada:</strong>{" "}
                  <span className="text-[var(--sm-muted)]">{alert.recommendedAction}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sm-border)] pt-3">
                  <div className="flex items-center gap-2">
                    {whatsappUrl && (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                          <MessageSquare className="size-3.5" />
                          <span>Notificar no WhatsApp</span>
                        </Button>
                      </a>
                    )}
                    <Link href="/agenda">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[var(--sm-muted)] hover:text-[var(--sm-ink)]">
                        <Calendar className="size-3.5" />
                        <span>Agendar Retorno</span>
                      </Button>
                    </Link>
                  </div>

                  <Link href={`/clientes/${alert.clientId}/visao-360`}>
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-[var(--sm-brand)]">
                      <span>Prontuário 360</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
