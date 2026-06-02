import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Flame } from 'lucide-react'

interface ConsistencyBadgeProps {
  patientId: string
}

export function ConsistencyBadge({ patientId }: ConsistencyBadgeProps) {
  const [consistency, setConsistency] = useState<number | null>(null)

  useEffect(() => {
    api.get(`/metrics/consistency/${patientId}`)
      .then(res => setConsistency(res.data.percentage))
      .catch(() => setConsistency(0))
  }, [patientId])
  if (consistency === null) {
    return <div className="animate-pulse h-6 w-20 bg-slate-100 rounded-full"></div>
  }

  const isHigh = consistency >= 75
  const isMedium = consistency >= 40 && consistency < 75

  const colorClass = isHigh
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : isMedium
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-rose-100 text-rose-700 border-rose-200"

  return (
    <div 
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold shadow-sm transition-all hover:scale-105 cursor-default ${colorClass}`}
      title="Consistência nos últimos 7 dias"
    >
      <Flame className={`w-3.5 h-3.5 ${isHigh ? 'text-emerald-500' : isMedium ? 'text-amber-500' : 'text-rose-500'}`} />
      {consistency}% de foco
    </div>
  )
}