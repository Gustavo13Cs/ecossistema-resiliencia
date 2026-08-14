"use client"

import { useAuth } from "@/contexts/auth-context"
import { useHomeDashboard } from "@/hooks/features/useHomeDashboard"
import { PainelUTI } from "@/components/dashboard/PainelUTI"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Users, AlertTriangle, ArrowRight, Dumbbell, Apple,
  HeartPulse, Calculator, ClipboardList, Beaker,
  ActivitySquare, Zap, UserX, TrendingDown, Activity,
  Flame, ShieldAlert
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

function formatToday() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long"
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  return `há ${days} dias`
}

const ALERT_TYPE_LABEL: Record<string, string> = {
  INACTIVE_5_DAYS: "Inatividade",
  PLATEAU_3_WEEKS: "Platô",
  OVERTRAINING_RISK: "Overtraining",
}

// ─── Theme by role ─────────────────────────────────────────────────────────────

const ROLE_THEME = {
  NUTRITIONIST: {
    label: "Nutrição Clínica",
    clientLabel: "Pacientes",
    gradient: "from-teal-600 to-emerald-500",
    accent: "text-teal-600",
    accentBg: "bg-teal-600 hover:bg-teal-700",
    accentLight: "bg-teal-50 text-teal-700 border-teal-200",
    icon: <Apple className="w-5 h-5" />,
    shortcuts: [
      { label: "Prescrever Dieta", href: "/membros", icon: <Apple className="w-4 h-4" /> },
      { label: "Cálculo Energético", href: "/membros", icon: <Calculator className="w-4 h-4" /> },
      { label: "Exames Lab", href: "/membros", icon: <ActivitySquare className="w-4 h-4" /> },
      { label: "Suplementação", href: "/membros", icon: <Beaker className="w-4 h-4" /> },
    ],
  },
  PERSONAL: {
    label: "Treinamento",
    clientLabel: "Alunos",
    gradient: "from-blue-600 to-indigo-500",
    accent: "text-blue-600",
    accentBg: "bg-blue-600 hover:bg-blue-700",
    accentLight: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Dumbbell className="w-5 h-5" />,
    shortcuts: [
      { label: "Prescrever Treino", href: "/membros", icon: <Dumbbell className="w-4 h-4" /> },
      { label: "Avaliar Aluno", href: "/membros", icon: <ClipboardList className="w-4 h-4" /> },
      { label: "Ver Alertas", href: "/membros", icon: <AlertTriangle className="w-4 h-4" /> },
      { label: "Todos os Alunos", href: "/membros", icon: <Users className="w-4 h-4" /> },
    ],
  },
  PHYSIO: {
    label: "Reabilitação",
    clientLabel: "Pacientes",
    gradient: "from-purple-600 to-violet-500",
    accent: "text-purple-600",
    accentBg: "bg-purple-600 hover:bg-purple-700",
    accentLight: "bg-purple-50 text-purple-700 border-purple-200",
    icon: <HeartPulse className="w-5 h-5" />,
    shortcuts: [
      { label: "Plano de Reabilitação", href: "/membros", icon: <HeartPulse className="w-4 h-4" /> },
      { label: "Avaliação Postural", href: "/membros", icon: <Activity className="w-4 h-4" /> },
      { label: "Todos os Pacientes", href: "/membros", icon: <Users className="w-4 h-4" /> },
      { label: "Nova Anamnese", href: "/membros", icon: <ClipboardList className="w-4 h-4" /> },
    ],
  },
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, variant = "default"
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  variant?: "default" | "danger" | "warning" | "success"
}) {
  const variantStyles = {
    default: "border-slate-100 bg-white",
    danger: "border-rose-200 bg-rose-50",
    warning: "border-amber-200 bg-amber-50",
    success: "border-emerald-200 bg-emerald-50",
  }
  const textStyles = {
    default: "text-slate-800",
    danger: "text-rose-700",
    warning: "text-amber-700",
    success: "text-emerald-700",
  }
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${variant === "default" ? "bg-slate-100" : variantStyles[variant]}`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black ${textStyles[variant]}`}>{value}</p>
      {sub && <p className={`text-xs font-medium mt-1 ${textStyles[variant]} opacity-70`}>{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth()
  const { summary, loading } = useHomeDashboard()

  const role = (user?.role as keyof typeof ROLE_THEME) ?? "NUTRITIONIST"
  const theme = ROLE_THEME[role] ?? ROLE_THEME.NUTRITIONIST
  const firstName = (user as any)?.name?.split(" ")[0] ?? ""

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent border-slate-300 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando seu painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8 pt-8">

        {/* ═══════════════════ HERO ═══════════════════ */}
        <div className={`relative bg-gradient-to-r ${theme.gradient} rounded-2xl p-8 text-white shadow-lg overflow-hidden`}>
          {/* Decoração de fundo */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-4 w-28 h-28 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-white/70 text-sm font-medium capitalize">{formatToday()}</p>
              <h1 className="text-3xl font-black mt-1">
                {getGreeting()}, {firstName}! 👋
              </h1>
              <p className="text-white/80 mt-2 text-base">
                Bem-vindo ao seu painel de {theme.label}.
                {summary && summary.activeAlertsCount > 0
                  ? ` Você tem ${summary.activeAlertsCount} alerta${summary.activeAlertsCount > 1 ? "s" : ""} ativo${summary.activeAlertsCount > 1 ? "s" : ""}.`
                  : " Todos os pacientes estão em dia."}
              </p>
            </div>
            <Link href="/membros" className="shrink-0">
              <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold h-12 px-6 backdrop-blur-sm">
                Ver {theme.clientLabel} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ═══════════════════ STAT CARDS ═══════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-slate-600" />}
            label={`${theme.clientLabel} Ativos`}
            value={summary?.patientsCount ?? 0}
            sub="vinculados à sua conta"
            variant="default"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
            label="Alertas Críticos"
            value={summary?.highAlertsCount ?? 0}
            sub={summary?.highAlertsCount ? "requerem atenção urgente" : "nenhum alerta crítico"}
            variant={summary?.highAlertsCount ? "danger" : "success"}
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-amber-600" />}
            label="Alertas Moderados"
            value={summary?.mediumAlertsCount ?? 0}
            sub={summary?.mediumAlertsCount ? "monitorar de perto" : "tudo sob controle"}
            variant={summary?.mediumAlertsCount ? "warning" : "success"}
          />
          <StatCard
            icon={<UserX className="w-5 h-5 text-slate-500" />}
            label="Inativos (7 dias)"
            value={summary?.inactivePatients?.length ?? 0}
            sub="sem registro de atividade"
            variant={summary?.inactivePatients?.length ? "warning" : "success"}
          />
        </div>

        {/* ═══════════════════ PAINEL UTI + ATALHOS ═══════════════════ */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Alertas — ocupa 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-black text-slate-800">Radar de Alertas</h2>
              {summary && summary.activeAlertsCount > 0 && (
                <span className="text-xs font-black text-white bg-rose-500 px-2.5 py-0.5 rounded-full">
                  {summary.activeAlertsCount}
                </span>
              )}
            </div>
            <PainelUTI />
          </div>

          {/* Coluna direita — Atalhos + Inativos */}
          <div className="space-y-6">

            {/* Atalhos Rápidos */}
            <div>
              <h2 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Ações Rápidas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {theme.shortcuts.map((s, i) => (
                  <Link key={i} href={s.href}>
                    <div className={`border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${theme.accentLight}`}>
                      <div className="mb-2">{s.icon}</div>
                      <p className="text-xs font-black leading-tight">{s.label}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pacientes Inativos */}
            {summary && summary.inactivePatients.length > 0 && (
              <div>
                <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-500" />
                  Inativos esta Semana
                </h2>
                <div className="space-y-2">
                  {summary.inactivePatients.map(p => (
                    <Link key={p.id} href={`/membros/${p.id}`}>
                      <div className="bg-white border border-amber-200 rounded-xl p-3.5 flex items-center justify-between hover:border-amber-400 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-black text-amber-700 text-sm">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-bold text-slate-700">{p.name}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ FEED DE ALERTAS RECENTES ═══════════════════ */}
        {summary && summary.recentAlerts.length > 0 && (
          <div>
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" />
              Atividade Recente
            </h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-50">
                {summary.recentAlerts.map((alert) => {
                  const isHigh = alert.severity === "HIGH"
                  return (
                    <Link key={alert.id} href={`/membros/${alert.patient.id}`}>
                      <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isHigh ? "bg-rose-500" : "bg-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{alert.patient.name}</p>
                          <p className="text-xs text-slate-500 truncate">{alert.message}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isHigh ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50"}`}>
                            {ALERT_TYPE_LABEL[alert.type] ?? alert.type}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(alert.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}