"use client"

import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { usePatientOverview } from "@/hooks/features/usePatientOverview"
import Link from "next/link"
import {
  ArrowLeft, Apple, Dumbbell, HeartPulse, Scale, AlertTriangle,
  Zap, FlaskConical, Clock, TrendingDown, TrendingUp, Minus,
  ShieldAlert, CheckCircle, XCircle, Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateShort(dateStr?: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

const ALERT_LABELS: Record<string, string> = {
  INACTIVE_5_DAYS: "Inatividade",
  PLATEAU_3_WEEKS: "Platô de 3 semanas",
  OVERTRAINING_RISK: "Risco de Overtraining",
}

// Ícone por tipo de evento na timeline
function TimelineIcon({ type }: { type: string }) {
  const configs: Record<string, { icon: React.ReactNode; color: string }> = {
    DIET:       { icon: <Apple className="w-4 h-4" />,        color: "bg-teal-500" },
    WORKOUT:    { icon: <Dumbbell className="w-4 h-4" />,     color: "bg-blue-500" },
    REHAB:      { icon: <HeartPulse className="w-4 h-4" />,   color: "bg-purple-500" },
    ASSESSMENT: { icon: <Scale className="w-4 h-4" />,        color: "bg-slate-600" },
    LAB:        { icon: <FlaskConical className="w-4 h-4" />,  color: "bg-rose-500" },
    PHYSIO:     { icon: <Activity className="w-4 h-4" />,      color: "bg-violet-500" },
  }
  const meta = configs[type] || { icon: <Clock className="w-4 h-4" />, color: "bg-slate-400" }
  return (
    <div className={`w-9 h-9 rounded-full ${meta.color} flex items-center justify-center text-white shrink-0 shadow-sm z-10`}>
      {meta.icon}
    </div>
  )
}

// ─── Componentes menores ──────────────────────────────────────────────────────

function StatusChip({ active, label }: { active: boolean; label: string }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
      <CheckCircle className="w-3.5 h-3.5" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
      <XCircle className="w-3.5 h-3.5" /> Sem plano ativo
    </span>
  )
}

function WeightDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-slate-400 text-sm">Sem comparativo</span>
  if (delta === 0) return (
    <span className="flex items-center gap-1 text-slate-500 font-bold text-sm">
      <Minus className="w-4 h-4" /> Sem variação
    </span>
  )
  const isPositive = delta > 0
  return (
    <span className={`flex items-center gap-1 font-bold text-sm ${isPositive ? "text-rose-500" : "text-emerald-500"}`}>
      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {isPositive ? "+" : ""}{delta} kg
    </span>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Visao360Page() {
  const params = useParams()
  const { user: loggedInUser } = useAuth()
  const patientId = params.id as string
  const { overview, loading, error } = usePatientOverview(patientId)

  const isPersonal = loggedInUser?.role === "PERSONAL"
  const isFisio    = loggedInUser?.role === "PHYSIO"
  const accentColor = isPersonal ? "blue" : isFisio ? "purple" : "teal"

  const accentMap = {
    blue:   { border: "border-blue-500",   text: "text-blue-600",   bg: "bg-blue-600" },
    purple: { border: "border-purple-500", text: "text-purple-600", bg: "bg-purple-600" },
    teal:   { border: "border-teal-500",   text: "text-teal-600",   bg: "bg-teal-600" },
  }
  const accent = accentMap[accentColor]

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mx-auto ${accent.border}`} />
          <p className="text-slate-500 font-medium">Carregando visão 360°...</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !overview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100 max-w-md">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar</h2>
          <p className="text-slate-500 text-sm">{error || "Dados não encontrados."}</p>
          <Link href={`/clientes/${patientId}`} className="mt-6 inline-block">
            <Button variant="outline">Voltar à ficha</Button>
          </Link>
        </div>
      </div>
    )
  }

  const {
    patient, activeDietPlan, activeWorkout, activeRehabPlan,
    latestAssessment, weightDelta, latestLabExam, activeAlerts,
    latestPhysioAssessment, conflictWarning, recentTimeline,
  } = overview

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ════════════════ HEADER ════════════════ */}
      <div className={`bg-white border-b-4 ${accent.border} shadow-sm sticky top-0 z-30`}>
        <div className="w-full px-6 md:px-12 lg:px-20 mx-auto py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href={`/clientes/${patientId}`}>
              <Button variant="outline" size="icon" className="rounded-full shadow-sm">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-md ${accent.bg}`}>
              {patient.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">{patient.name}</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visão 360° · Painel Integrado</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {patient.goal && (
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                🎯 {patient.goal}
              </span>
            )}
            {patient.allergies && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                ⚠️ {patient.allergies}
              </span>
            )}
            {patient.pathologies && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200">
                🏥 {patient.pathologies}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8 pt-8">

        {/* ════════════════ ALERTAS ATIVOS ════════════════ */}
        {activeAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-500" /> Alertas Ativos ({activeAlerts.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border shadow-sm ${
                    alert.severity === "HIGH"
                      ? "bg-rose-50 border-rose-200"
                      : alert.severity === "MEDIUM"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    alert.severity === "HIGH"   ? "bg-rose-100 text-rose-600"
                    : alert.severity === "MEDIUM" ? "bg-amber-100 text-amber-600"
                    : "bg-slate-100 text-slate-500"
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase tracking-wider mb-0.5 ${
                      alert.severity === "HIGH"   ? "text-rose-500"
                      : alert.severity === "MEDIUM" ? "text-amber-500"
                      : "text-slate-400"
                    }`}>{ALERT_LABELS[alert.type] || alert.type}</p>
                    <p className="text-sm font-medium text-slate-700 leading-snug">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(alert.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════ CONFLITO DETECTADO ════════════════ */}
        {conflictWarning && (
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="p-2.5 bg-rose-100 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="font-black text-rose-700 text-sm uppercase tracking-wider mb-1">
                ⚠️ Possível Conflito de Tratamento
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{conflictWarning.message}</p>
              <p className="text-xs text-rose-400 mt-2 font-medium">
                Recomenda-se comunicação entre os especialistas antes de prosseguir com cargas altas.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════ 4 CARDS DE STATUS ════════════════ */}
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-slate-400" /> Status dos Planos Ativos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* ── Dieta ─────────────────── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-teal-50 rounded-xl">
                  <Apple className="w-5 h-5 text-teal-600" />
                </div>
                <StatusChip active={!!activeDietPlan} label="Ativo" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nutrição</p>
                {activeDietPlan ? (
                  <>
                    <p className="font-black text-slate-800 text-base leading-tight">{activeDietPlan.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activeDietPlan.goal}</p>
                    <div className="mt-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                      <p className="text-xl font-black text-teal-700">{activeDietPlan.targetKcal} kcal</p>
                      <p className="text-[10px] text-teal-500 font-bold mt-0.5">
                        P: {activeDietPlan.proteinG}g · C: {activeDietPlan.carbsG}g · G: {activeDietPlan.fatG}g
                      </p>
                    </div>
                    {activeDietPlan.creator && (
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">por {activeDietPlan.creator.name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Nenhum plano alimentar ativo</p>
                )}
              </div>
            </div>

            {/* ── Treino ────────────────── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Dumbbell className="w-5 h-5 text-blue-600" />
                </div>
                <StatusChip active={!!activeWorkout} label="Ativo" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Treino</p>
                {activeWorkout ? (
                  <>
                    <p className="font-black text-slate-800 text-base leading-tight">{activeWorkout.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activeWorkout.goal}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {activeWorkout.splits.slice(0, 4).map(s => (
                        <span key={s.id} className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                          {s.name}
                        </span>
                      ))}
                      {activeWorkout.durationWeeks && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          {activeWorkout.durationWeeks}sem
                        </span>
                      )}
                    </div>
                    {activeWorkout.creator && (
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">por {activeWorkout.creator.name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Nenhum plano de treino ativo</p>
                )}
              </div>
            </div>

            {/* ── Reabilitação ──────────── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-purple-50 rounded-xl">
                  <HeartPulse className="w-5 h-5 text-purple-600" />
                </div>
                <StatusChip active={!!activeRehabPlan} label="Ativo" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fisioterapia</p>
                {activeRehabPlan ? (
                  <>
                    <p className="font-black text-slate-800 text-base leading-tight">{activeRehabPlan.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activeRehabPlan.goal}</p>
                    {latestPhysioAssessment?.painLevel != null && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider mb-1.5">Dor Atual (EVA)</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                latestPhysioAssessment.painLevel >= 7 ? "bg-rose-500"
                                : latestPhysioAssessment.painLevel >= 4 ? "bg-amber-500"
                                : "bg-emerald-500"
                              }`}
                              style={{ width: `${latestPhysioAssessment.painLevel * 10}%` }}
                            />
                          </div>
                          <span className={`text-sm font-black ${
                            latestPhysioAssessment.painLevel >= 7 ? "text-rose-600"
                            : latestPhysioAssessment.painLevel >= 4 ? "text-amber-600"
                            : "text-emerald-600"
                          }`}>{latestPhysioAssessment.painLevel}/10</span>
                        </div>
                      </div>
                    )}
                    {activeRehabPlan.creator && (
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">por {activeRehabPlan.creator.name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Nenhum plano de reabilitação ativo</p>
                )}
              </div>
            </div>

            {/* ── Composição Corporal ────── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-slate-100 rounded-xl">
                  <Scale className="w-5 h-5 text-slate-600" />
                </div>
                <StatusChip active={!!latestAssessment} label="Registrada" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Corpo</p>
                {latestAssessment ? (
                  <>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="font-black text-slate-800 text-3xl leading-none">
                        {latestAssessment.weight ?? "-"}
                      </p>
                      <span className="text-slate-400 text-sm mb-1">kg</span>
                    </div>
                    <div className="mt-1">
                      <WeightDelta delta={weightDelta} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {latestAssessment.bodyFat != null && (
                        <div className="bg-rose-50 rounded-lg p-2 border border-rose-100">
                          <p className="text-[9px] font-black text-rose-400 uppercase">Gordura</p>
                          <p className="font-black text-rose-600 text-sm">{latestAssessment.bodyFat}%</p>
                        </div>
                      )}
                      {latestAssessment.muscleMass != null && (
                        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-400 uppercase">Músculo</p>
                          <p className="font-black text-emerald-600 text-sm">{latestAssessment.muscleMass} kg</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                      Avaliação de {formatDateShort(latestAssessment.date)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Nenhuma avaliação registrada</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ════════════════ LINHA INFERIOR: TIMELINE + EXAMES ════════════════ */}
        <div className="grid lg:grid-cols-2 gap-8 pb-4">

          {/* ─── Linha do Tempo ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-black text-slate-700 text-sm">Linha do Tempo</h3>
              <span className="text-xs text-slate-400">(eventos de todas as áreas)</span>
            </div>
            <div className="p-5">
              {recentTimeline.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium">Nenhum evento registrado ainda.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-slate-100" />
                  <div className="space-y-5">
                    {recentTimeline.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-4 relative">
                        <TimelineIcon type={event.type} />
                        <div className="flex-1 min-w-0 pt-1.5">
                          <p className="text-sm font-bold text-slate-800 leading-snug">{event.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(event.date)} · {event.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Últimos Exames Laboratoriais ───────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-rose-500" />
              <h3 className="font-black text-slate-700 text-sm">Último Exame Laboratorial</h3>
            </div>
            <div className="p-5">
              {!latestLabExam ? (
                <div className="text-center py-8 text-slate-400">
                  <FlaskConical className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-medium">Nenhum exame laboratorial registrado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Coleta: {formatDate(latestLabExam.date)}
                    </p>
                    <Link href={`/membros/${patientId}/exames`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600"
                      >
                        Ver histórico
                      </Button>
                    </Link>
                  </div>
                  {latestLabExam.markers.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhum marcador registrado neste exame.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {latestLabExam.markers.map(marker => (
                        <div
                          key={marker.id}
                          className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 hover:border-rose-200 transition-colors"
                        >
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-tight">{marker.name}</p>
                          <div className="flex items-end gap-1 mt-1.5">
                            <span className="text-xl font-black text-slate-800">{marker.value}</span>
                            <span className="text-xs text-slate-400 mb-0.5">{marker.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {latestLabExam.notes && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm text-slate-600">
                      <span className="font-bold text-amber-700">Obs: </span>{latestLabExam.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}