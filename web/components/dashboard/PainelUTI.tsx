"use client"

import { useProfessionalAlerts } from "@/hooks/features/useProfessionalAlerts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Activity, Phone, ArrowRight, TrendingDown } from "lucide-react"
import Link from "next/link"

export function PainelUTI() {
  const { alerts, loadingAlerts } = useProfessionalAlerts()

  if (loadingAlerts) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Analisando métricas de risco...</div>
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-emerald-50">
        <CardContent className="p-6 text-center text-emerald-700">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-bold">Todos os alunos estão consistentes.</p>
          <p className="text-sm opacity-80">Nenhum alerta crítico detectado no radar.</p>
        </CardContent>
      </Card>
    )
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'INACTIVE_5_DAYS': return <AlertTriangle className="w-5 h-5 text-rose-500" />
      case 'OVERTRAINING_RISK': return <Activity className="w-5 h-5 text-orange-500" />
      case 'PLATEAU_3_WEEKS': return <TrendingDown className="w-5 h-5 text-amber-500" />
      default: return <AlertTriangle className="w-5 h-5" />
    }
  }

  const getAlertColor = (severity: string) => {
    return severity === 'HIGH' ? 'border-l-rose-500 bg-rose-50/30' : 'border-l-amber-500 bg-amber-50/30'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-rose-600" />
        <h2 className="text-xl font-black text-slate-800">Painel UTI (Atenção Requerida)</h2>
      </div>

      <div className="grid gap-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={`border-0 border-l-4 shadow-sm ${getAlertColor(alert.severity)}`}>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">{getAlertIcon(alert.type)}</div>
                <div>
                  <h4 className="font-bold text-slate-800">{alert.patient.name}</h4>
                  <p className="text-sm font-medium text-slate-600">{alert.message}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="bg-white border-slate-200 text-slate-600 hover:text-green-600 hover:border-green-300"
                  onClick={() => window.open(`https://wa.me/${alert.patient.phone.replace(/\D/g, '')}`, '_blank')}
                >
                  <Phone className="w-4 h-4 mr-2" /> Cobrar Aluno
                </Button>
                <Link href={`/membros/${alert.patient.id}`}>
                  <Button className="bg-slate-800 hover:bg-slate-700 text-white">
                    Ajustar Treino <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}