"use client"

import React from "react"
import Link from "next/link"
import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb, AlertCircle, ArrowRight } from "lucide-react"
import { ManagementInsight } from "@/types/management-reports"

interface ManagementInsightsBannerProps {
  insights: ManagementInsight[]
}

export const ManagementInsightsBanner: React.FC<ManagementInsightsBannerProps> = ({ insights }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case "TIP":
        return <Lightbulb className="h-4 w-4 text-sky-600 dark:text-sky-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
    }
  }

  const getBorderBg = (type: string) => {
    switch (type) {
      case "SUCCESS":
        return "bg-emerald-500/5 border-emerald-500/20"
      case "WARNING":
        return "bg-amber-500/5 border-amber-500/20"
      case "TIP":
        return "bg-sky-500/5 border-sky-500/20"
      default:
        return "bg-rose-500/5 border-rose-500/20"
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Diagnósticos & Recomendações Estratégicas de Gestão
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {insights.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${getBorderBg(
              item.type
            )}`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {getIcon(item.type)}
                <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground text-[11px]">
                Impacto: <strong className="text-muted-foreground font-normal">{item.impact}</strong>
              </span>

              {item.actionLabel && item.actionHref && (
                <Link
                  href={item.actionHref}
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  {item.actionLabel} &rarr;
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
