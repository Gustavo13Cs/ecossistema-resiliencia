"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Sparkles,
  Users,
  ShieldCheck,
  Utensils,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useManagementReports } from "@/hooks/features/useManagementReports"
import { ManagementKpiCards } from "@/components/features/management/ManagementKpiCards"
import { RetentionFunnelCard } from "@/components/features/management/RetentionFunnelCard"
import { DietAdherenceBreakdownCard } from "@/components/features/management/DietAdherenceBreakdownCard"
import { AppointmentsVolumeChart } from "@/components/features/management/AppointmentsVolumeChart"
import { ClientGrowthChart } from "@/components/features/management/ClientGrowthChart"
import { ManagementInsightsBanner } from "@/components/features/management/ManagementInsightsBanner"
import { ManagementPeriod } from "@/types/management-reports"

type ManagementTab = "overview" | "retention" | "adherence" | "appointments" | "growth"

export default function RelatoriosPage() {
  const {
    loading,
    period,
    setPeriod,
    report,
    isExporting,
    exportToCSV,
    generatePDFReport,
  } = useManagementReports()

  const [activeTab, setActiveTab] = useState<ManagementTab>("overview")

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <AsyncState
          kind="loading"
          title="Consolidando métricas de gestão..."
          description="Calculando taxas de retenção, adesão alimentar e evolução da carteira de clientes."
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Visão geral
        </Link>
      </div>

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <BarChart3 className="h-4 w-4" />
            <span>Gestão Estratégica do Nutricionista</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Relatórios & Métricas de Gestão
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Painel gerencial consolidado com indicadores de retenção, taxa de adesão a planos
            alimentares, volume de atendimentos e crescimento da base privada.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-lg shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ManagementPeriod)}
              className="bg-transparent border-none text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
            >
              <option value="30_DAYS">Últimos 30 Dias (Mês)</option>
              <option value="90_DAYS">Últimos 90 Dias (Trimestre)</option>
              <option value="180_DAYS">Últimos 180 Dias (Semestre)</option>
              <option value="365_DAYS">Último Ano (365 Dias)</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={isExporting}
            className="cursor-pointer text-xs gap-1.5 shadow-xs bg-card"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Exportar CSV
          </Button>

          <Button
            size="sm"
            onClick={generatePDFReport}
            className="cursor-pointer text-xs gap-1.5 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <ManagementKpiCards
        report={report}
        onNavigateTab={(tab) => setActiveTab(tab as ManagementTab)}
      />

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Visão Geral & Insights</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("retention")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "retention"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Retenção & Evasão (Churn)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("adherence")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "adherence"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Utensils className="h-4 w-4" />
          <span>Adesão a Planos Alimentares</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "appointments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Atendimentos & Produtividade</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("growth")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "growth"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Crescimento da Carteira</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. VISÃO GERAL & INSIGHTS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <ManagementInsightsBanner insights={report.insights} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RetentionFunnelCard retention={report.retention} />
            <DietAdherenceBreakdownCard adherence={report.dietAdherence} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AppointmentsVolumeChart appointments={report.appointments} />
            <ClientGrowthChart growth={report.growth} />
          </div>
        </div>
      )}

      {/* 2. RETENÇÃO & EVASÃO */}
      {activeTab === "retention" && (
        <div className="space-y-6">
          <RetentionFunnelCard retention={report.retention} />

          <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">
                Tabela de Retenção por Coorte de Acompanhamento
              </h4>
              <span className="text-xs text-muted-foreground">
                Base consolidada do período ({period})
              </span>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="p-3">Fase do Ciclo</th>
                    <th className="p-3 text-center">Taxa de Permanência</th>
                    <th className="p-3 text-right">Clientes Ativos</th>
                    <th className="p-3 text-right">Evasão Acumulada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.retention.cohortData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{row.month}</td>
                      <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {row.activeRate}%
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">
                        {row.retainedCount} clientes
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.churnedCount} clientes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADESÃO A PLANOS */}
      {activeTab === "adherence" && (
        <div className="space-y-6">
          <DietAdherenceBreakdownCard adherence={report.dietAdherence} />
        </div>
      )}

      {/* 4. ATENDIMENTOS & PRODUTIVIDADE */}
      {activeTab === "appointments" && (
        <div className="space-y-6">
          <AppointmentsVolumeChart appointments={report.appointments} />
        </div>
      )}

      {/* 5. CRESCIMENTO DA CARTEIRA */}
      {activeTab === "growth" && (
        <div className="space-y-6">
          <ClientGrowthChart growth={report.growth} />
        </div>
      )}
    </div>
  )
}
