"use client"

import { useProfessionalAlerts } from "@/hooks/features/useProfessionalAlerts"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Activity, Phone, ArrowRight, TrendingDown, Zap, CheckCircle } from "lucide-react"
import Link from "next/link"

const ALERT_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  INACTIVE_5_DAYS: {
    label: "Inatividade",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  OVERTRAINING_RISK: {
    label: "Overtraining",
    icon: <Activity className="w-4 h-4" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  PLATEAU_3_WEEKS: {
    label: "Platô",
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  return `há ${days} dias`
}

export function PainelUTI() {
  const { alerts, loadingAlerts } = useProfessionalAlerts()

  if (loadingAlerts) {
    return (
      <div className="grid gap-3">
        {[1, 2].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-emerald-800">Tudo em ordem!</p>
          <p className="text-sm text-emerald-600 mt-0.5">Nenhum alerta crítico detectado. Continue monitorando.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {alerts.map((alert) => {
        const meta = ALERT_META[alert.type] ?? ALERT_META.INACTIVE_5_DAYS
        const isHigh = alert.severity === "HIGH"
        return (
          <div
            key={alert.id}
            className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${meta.bg} ${meta.border}`}
          >
            <div className="flex items-start gap-4">
              {/* Avatar com inicial */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0 ${isHigh ? 'bg-rose-500' : 'bg-amber-400'}`}>
                {alert.patient.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-slate-800 text-sm">{alert.patient.name}</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}>
                    {meta.icon} {meta.label}
                    {isHigh && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{alert.message}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{timeAgo(alert.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pl-14 sm:pl-0">
              {alert.patient.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 h-8"
                  onClick={() => window.open(`https://wa.me/${alert.patient.phone.replace(/\D/g, '')}`, '_blank')}
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5" /> Contatar
                </Button>
              )}
              <Link href={`/membros/${alert.patient.id}`}>
                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white h-8">
                  Ver Ficha <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}