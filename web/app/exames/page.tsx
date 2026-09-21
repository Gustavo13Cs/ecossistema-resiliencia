"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  FileText,
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  Eye,
  Trash2,
  TrendingUp,
  ExternalLink,
  Copy,
  Printer,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Columns2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useCentralLabExams } from "@/hooks/features/useCentralLabExams"
import { LabExamsKpiSummary } from "@/components/features/lab-exams/LabExamsKpiSummary"
import { LongitudinalMarkerChart } from "@/components/features/lab-exams/LongitudinalMarkerChart"
import { ExamRegistryModal } from "@/components/features/lab-exams/ExamRegistryModal"
import { ExamOrderIssuerModal } from "@/components/features/lab-exams/ExamOrderIssuerModal"
import { LabExamDetailDrawer } from "@/components/features/lab-exams/LabExamDetailDrawer"
import { ConsolidatedLabExam, ConsolidatedLabMarker, IssuedLabOrder, MarkerCategory, MarkerStatus } from "@/types/lab-exam"
import { toast } from "sonner"

type MainTab = "exams" | "longitudinal" | "orders"

const categoryLabels: Record<string, string> = {
  GLYCEMIC: "Metabolismo & Glicemia",
  LIPID: "Perfil Lipídico & Cardiovascular",
  THYROID: "Função Tireoidiana",
  HEMATOLOGY: "Hemograma & Série Vermelha",
  VITAMINS_MINERALS: "Micronutrientes & Vitaminas",
  HEPATIC_RENAL: "Função Hepática & Renal",
  INFLAMMATORY: "Marcadores Inflamatórios",
  HORMONAL: "Eixo Hormonal & Esteróides",
  OUTROS: "Outros Biomarcadores",
}

export default function ExamesPage() {
  const {
    loading,
    clients,
    exams,
    orders,
    kpis,
    allAvailableMarkers,
    searchQuery,
    setSearchQuery,
    selectedClientId,
    setSelectedClientId,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    registerExam,
    issueOrder,
    deleteExam,
    deleteOrder,
    getMarkerLongitudinalSeries,
  } = useCentralLabExams()

  const [activeTab, setActiveTab] = useState<MainTab>("exams")
  const [viewMode, setViewMode] = useState<"OPEN" | "COMPACT">("OPEN")
  const [collapsedExamIds, setCollapsedExamIds] = useState<Set<string>>(new Set())
  const [isRegistryModalOpen, setIsRegistryModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedExamForDetail, setSelectedExamForDetail] = useState<ConsolidatedLabExam | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)

  const toggleExamCollapse = (examId: string) => {
    setCollapsedExamIds((prev) => {
      const next = new Set(prev)
      if (next.has(examId)) {
        next.delete(examId)
      } else {
        next.add(examId)
      }
      return next
    })
  }

  const collapseAll = () => {
    setCollapsedExamIds(new Set(exams.map((e) => e.id)))
  }

  const expandAll = () => {
    setCollapsedExamIds(new Set())
  }

  const handleCopyOrderWhatsApp = (order: IssuedLabOrder) => {
    const text = `📋 *PEDIDO DE EXAMES LABORATORIAIS - SAFEMOVE*

*Paciente:* ${order.clientName}
*Data:* ${new Date(`${order.issuedAt}T12:00:00`).toLocaleDateString("pt-BR")}
*Indicação Clínica:* ${order.clinicalIndication}

🔬 *Exames Solicitados:*
${order.markers.map((m, i) => `${i + 1}. ${m}`).join("\n")}

⚠️ *Orientações de Preparo:*
${order.preparationInstructions}

_Documento emitido via SafeMove - Sistema Integrado de Saúde & Nutrição_`

    navigator.clipboard.writeText(text)
    setCopiedOrderId(order.id)
    toast.success("Requisição copiada para o WhatsApp!")
    setTimeout(() => setCopiedOrderId(null), 2500)
  }

  const handlePrintOrder = (order: IssuedLabOrder) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Permita pop-ups no navegador para imprimir a requisição.")
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido de Exames - ${order.clientName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .logo { font-size: 20px; font-weight: 800; color: #0f172a; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 14px; }
          .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
          ol { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; }
          .instructions { font-size: 13px; color: #475569; background: #f1f5f9; padding: 12px; border-radius: 6px; line-height: 1.5; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature-line { border-top: 1px solid #64748b; width: 240px; text-align: center; padding-top: 8px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">SAFEMOVE HEALTH & CLINICAL NUTRITION</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Requisição Laboratorial Padronizada</div>
          </div>
          <div style="font-size: 12px; text-align: right;">
            Data: ${new Date(`${order.issuedAt}T12:00:00`).toLocaleDateString("pt-BR")}
          </div>
        </div>

        <div class="patient-box">
          <div><strong>Paciente:</strong> ${order.clientName}</div>
          <div style="margin-top: 4px;"><strong>Indicação Clínica:</strong> ${order.clinicalIndication}</div>
          ${order.templateTitle ? `<div style="margin-top: 4px; font-size: 12px; color: #64748b;">Protocolo: ${order.templateTitle}</div>` : ""}
        </div>

        <div class="section-title">EXAMES SOLICITADOS</div>
        <ol>
          ${order.markers.map((m) => `<li><strong>${m}</strong></li>`).join("")}
        </ol>

        <div class="section-title">ORIENTAÇÕES AO PACIENTE / LABORATÓRIO</div>
        <div class="instructions">${order.preparationInstructions}</div>

        <div class="footer">
          <div style="font-size: 11px; color: #94a3b8;">Emitido digitalmente via SafeMove</div>
          <div class="signature-line">Assinatura / Carimbo Profissional</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <AsyncState
          kind="loading"
          title="Carregando exames laboratoriais..."
          description="Sincronizando histórico bioquímico e biomarcadores da base de clientes."
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
            <FlaskConical className="h-4 w-4" />
            <span>Acompanhamento Clínico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Central de Exames Laboratoriais
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Visão consolidada de exames bioquímicos e laboratoriais solicitados e recebidos, com rastreamento
            longitudinal de biomarcadores (lipidograma, glicemia, hemograma, tireoide).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsOrderModalOpen(true)}
            className="cursor-pointer text-xs gap-1.5 shadow-xs"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            Emitir Pedido de Exame
          </Button>

          <Button
            onClick={() => setIsRegistryModalOpen(true)}
            className="cursor-pointer text-xs gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar Novo Laudo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <LabExamsKpiSummary
        kpis={kpis}
        onFilterAlerts={() => {
          setActiveTab("exams")
          setStatusFilter(statusFilter === "ALERT" ? "ALL" : "ALERT")
        }}
        onFilterOrders={() => setActiveTab("orders")}
      />

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("exams")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "exams"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          <span>Laudos & Exames Recebidos</span>
          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground">
            {exams.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("longitudinal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "longitudinal"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Comparativo Longitudinal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Pedidos Emitidos</span>
          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-foreground">
            {orders.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Laudos & Exames */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {/* Filter Bar & View Mode Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border shadow-xs">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, laboratório ou marcador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              {/* Client select */}
              <div className="sm:w-56">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                >
                  <option value="ALL">Todos os Pacientes</option>
                  {clients.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status & Category filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ALERT">Com Marcadores em Alerta</option>
                <option value="BORDERLINE">Com Marcadores Limítrofes</option>
                <option value="OPTIMAL">Marcadores em Nível Ótimo</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                <option value="ALL">Todas Categorias</option>
                <option value="GLYCEMIC">Glicêmico & Metabólico</option>
                <option value="LIPID">Perfil Lipídico</option>
                <option value="THYROID">Tireoidiano</option>
                <option value="HEMATOLOGY">Hematologia</option>
                <option value="VITAMINS_MINERALS">Vitaminas & Minerais</option>
              </select>

              {/* View mode toggle (Open vs Compact) */}
              <div className="flex items-center bg-secondary/70 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode("OPEN")}
                  title="Visualização Aberta (Todos os biomarcadores visíveis)"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "OPEN"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>Aberto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("COMPACT")}
                  title="Visualização em Cards Compactos"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "COMPACT"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {(searchQuery || selectedClientId !== "ALL" || statusFilter !== "ALL" || categoryFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedClientId("ALL")
                    setStatusFilter("ALL")
                    setCategoryFilter("ALL")
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline px-1 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Quick toggle Expand All / Collapse All when in Open view mode */}
          {viewMode === "OPEN" && exams.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Mostrando todos os laudos e biomarcadores abertos na tela</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-foreground font-medium underline cursor-pointer"
                >
                  Expandir Todos
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-foreground font-medium underline cursor-pointer"
                >
                  Recolher Todos
                </button>
              </div>
            </div>
          )}

          {/* Exams List */}
          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-dashed border-border">
              <FlaskConical className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum laudo encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Não foram encontrados exames com os filtros selecionados. Cadastre um novo laudo ou ajuste os critérios.
              </p>
              <Button
                size="sm"
                onClick={() => setIsRegistryModalOpen(true)}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Registrar Primeiro Laudo
              </Button>
            </div>
          ) : viewMode === "OPEN" ? (
            /* =========================================================
               VIEW MODE 1: 100% ABERTO (PAINEL CLÍNICO COMPLETO EM TELA)
               ========================================================= */
            <div className="space-y-6">
              {exams.map((exam) => {
                const isCollapsed = collapsedExamIds.has(exam.id)
                const alteredMarkers = exam.markers.filter(
                  (m) => m.status === "ALERT" || m.status === "BORDERLINE"
                )

                // Group markers by category
                const categoriesMap = new Map<string, ConsolidatedLabMarker[]>()
                exam.markers.forEach((m) => {
                  const cat = m.reference?.category || "OUTROS"
                  if (!categoriesMap.has(cat)) {
                    categoriesMap.set(cat, [])
                  }
                  categoriesMap.get(cat)!.push(m)
                })

                return (
                  <div
                    key={exam.id}
                    className="bg-card rounded-xl border border-border shadow-xs overflow-hidden transition-all"
                  >
                    {/* Header Banner */}
                    <div className="p-5 bg-gradient-to-r from-card to-muted/30 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold text-base flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                          {exam.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-base font-bold text-foreground">
                              {exam.clientName}
                            </h3>
                            {exam.hasAlerts ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                <AlertTriangle className="h-3 w-3" />
                                {alteredMarkers.length} {alteredMarkers.length === 1 ? "marcador em atenção" : "marcadores em atenção"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Todos os Marcadores em Nível Ótimo
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              Coleta em:{" "}
                              <strong className="text-foreground">
                                {new Date(`${exam.date}T12:00:00`).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </strong>
                            </span>
                            {exam.laboratoryName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Building className="h-3.5 w-3.5 text-primary" />
                                  Laboratório: <strong className="text-foreground">{exam.laboratoryName}</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {exam.pdfAttachment && (
                          <button
                            type="button"
                            onClick={() => {
                              alert(`Visualização do laudo digital: ${exam.pdfAttachment?.name}`)
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-md border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Laudo PDF</span>
                          </button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClientId(exam.clientId)
                            setActiveTab("longitudinal")
                          }}
                          className="h-8 text-xs gap-1 cursor-pointer bg-background"
                        >
                          <TrendingUp className="h-3.5 w-3.5 text-primary" /> Ver Gráfico
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExamCollapse(exam.id)}
                          className="h-8 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          {isCollapsed ? (
                            <>
                              <ChevronDown className="h-4 w-4" /> Abrir Detalhes
                            </>
                          ) : (
                            <>
                              <ChevronUp className="h-4 w-4" /> Recolher
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* OPEN CONTENT BODY */}
                    {!isCollapsed && (
                      <div className="p-5 sm:p-6 space-y-6">
                        {/* Clinical notes if any */}
                        {exam.notes && (
                          <div className="rounded-lg bg-muted/40 border border-border p-3.5 text-xs">
                            <div className="font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                              Anotações Clínicas & Conduta:
                            </div>
                            <p className="text-foreground leading-relaxed font-normal">{exam.notes}</p>
                          </div>
                        )}

                        {/* Complete Categorized Table of Biomarkers */}
                        <div className="space-y-4">
                          {Array.from(categoriesMap.entries()).map(([catKey, markers]) => (
                            <div key={catKey} className="rounded-lg border border-border overflow-hidden shadow-2xs">
                              {/* Category Title */}
                              <div className="bg-muted/70 px-4 py-2 text-xs font-bold text-foreground border-b border-border flex items-center justify-between">
                                <span className="uppercase tracking-wider">{categoryLabels[catKey] || catKey}</span>
                                <span className="text-[11px] font-medium text-muted-foreground">
                                  {markers.length} {markers.length === 1 ? "marcador" : "marcadores"}
                                </span>
                              </div>

                              {/* Desktop Headers */}
                              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2 bg-muted/30 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-4">Biomarcador</div>
                                <div className="col-span-3 text-right">Resultado Encontrado</div>
                                <div className="col-span-3">Valores de Referência</div>
                                <div className="col-span-2 text-center">Status</div>
                              </div>

                              {/* Rows */}
                              <div className="divide-y divide-border">
                                {markers.map((marker) => {
                                  const ref = marker.reference

                                  return (
                                    <div
                                      key={marker.id}
                                      className="px-4 py-2.5 bg-card hover:bg-muted/10 transition-colors flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 sm:items-center text-xs"
                                    >
                                      {/* 1. Name & Interpretation */}
                                      <div className="sm:col-span-4">
                                        <span className="font-semibold text-foreground text-sm block">
                                          {marker.name}
                                        </span>
                                        {ref?.interpretation && (
                                          <span className="text-[11px] text-muted-foreground mt-0.5 block leading-tight">
                                            {ref.interpretation}
                                          </span>
                                        )}
                                      </div>

                                      {/* 2. Measured Value */}
                                      <div className="sm:col-span-3 sm:text-right">
                                        <span className="text-base font-bold text-foreground">
                                          {marker.value}
                                        </span>{" "}
                                        <span className="text-xs text-muted-foreground font-medium">
                                          {marker.unit}
                                        </span>
                                      </div>

                                      {/* 3. Reference info */}
                                      <div className="sm:col-span-3 space-y-0.5 text-[11px] text-muted-foreground">
                                        {ref ? (
                                          <>
                                            {ref.optimalMin !== undefined && ref.optimalMax !== undefined && (
                                              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                Faixa ideal: {ref.optimalMin} – {ref.optimalMax} {ref.unit}
                                              </div>
                                            )}
                                            {ref.max !== undefined && (
                                              <div>Ref SBPC: máx {ref.max} {ref.unit}</div>
                                            )}
                                            {ref.min !== undefined && ref.optimalMin === undefined && (
                                              <div>Ref SBPC: mín {ref.min} {ref.unit}</div>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground/70">Padrão clínico</span>
                                        )}
                                      </div>

                                      {/* 4. Status Badge */}
                                      <div className="sm:col-span-2 flex sm:justify-center">
                                        {marker.status === "OPTIMAL" && (
                                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                            <CheckCircle2 className="h-3 w-3" /> Nível Ótimo
                                          </span>
                                        )}
                                        {marker.status === "BORDERLINE" && (
                                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                                            <AlertTriangle className="h-3 w-3" /> Limítrofe
                                          </span>
                                        )}
                                        {marker.status === "ALERT" && (
                                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                                            <AlertTriangle className="h-3 w-3" /> Fora da Faixa
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer Bar */}
                        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Excluir este laudo do paciente ${exam.clientName}?`)) {
                                deleteExam(exam.id)
                              }
                            }}
                            className="text-muted-foreground hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir Laudo
                          </button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedExamForDetail(exam)}
                            className="text-xs gap-1.5 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> Abrir em Janela Ampla
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* =========================================================
               VIEW MODE 2: CARDS COMPACTOS
               ========================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((exam) => {
                const alteredMarkers = exam.markers.filter(
                  (m) => m.status === "ALERT" || m.status === "BORDERLINE"
                )

                return (
                  <div
                    key={exam.id}
                    className="bg-card rounded-xl border border-border/80 p-5 shadow-xs hover:border-border transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Card Header: Client Name + Date */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                            {exam.clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground">
                              {exam.clientName}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(`${exam.date}T12:00:00`).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              {exam.laboratoryName && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {exam.laboratoryName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        {exam.hasAlerts ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full shrink-0">
                            <AlertTriangle className="h-3 w-3" />
                            {alteredMarkers.length} em atenção
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Ótimo
                          </span>
                        )}
                      </div>

                      {/* Biomarkers preview chips */}
                      <div className="mt-4 space-y-2">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Marcadores em destaque ({exam.markers.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {exam.markers.slice(0, 5).map((m) => (
                            <span
                              key={m.id}
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${
                                m.status === "ALERT"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : m.status === "BORDERLINE"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-secondary text-secondary-foreground border-border/60"
                              }`}
                            >
                              {m.name}: <strong>{m.value}</strong> {m.unit}
                            </span>
                          ))}
                          {exam.markers.length > 5 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                              +{exam.markers.length - 5} outros
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Attached PDF badge if exists */}
                      {exam.pdfAttachment && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/60">
                          <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{exam.pdfAttachment.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClientId(exam.clientId)
                          setActiveTab("longitudinal")
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                      >
                        <TrendingUp className="h-3.5 w-3.5" /> Ver Gráfico
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedExamForDetail(exam)}
                        className="text-xs gap-1.5 cursor-pointer font-medium"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver Aberto
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Comparativo Longitudinal */}
      {activeTab === "longitudinal" && (
        <div className="space-y-4">
          <LongitudinalMarkerChart
            clients={clients}
            allAvailableMarkers={allAvailableMarkers}
            getMarkerLongitudinalSeries={getMarkerLongitudinalSeries}
            selectedClientId={selectedClientId}
            onClientSelect={(cId) => setSelectedClientId(cId)}
          />
        </div>
      )}

      {/* TAB 3: Pedidos Emitidos */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Histórico de Pedidos de Exames Emitidos
              </h3>
              <p className="text-xs text-muted-foreground">
                Requisições geradas para orientação do paciente e realização em laboratórios parceiros
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsOrderModalOpen(true)}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Pedido
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-dashed border-border">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum pedido de exame emitido</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Emita requisições laboratoriais padronizadas para seus pacientes com 1 clique.
              </p>
              <Button
                size="sm"
                onClick={() => setIsOrderModalOpen(true)}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" /> Emitir Primeiro Pedido
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border border-border/80 p-5 shadow-xs hover:border-border transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                          {order.templateTitle || "Requisição Laboratorial"}
                        </span>
                        <h4 className="text-base font-bold text-foreground mt-0.5">
                          {order.clientName}
                        </h4>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Emitido em:{" "}
                            {new Date(`${order.issuedAt}T12:00:00`).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer transition-colors"
                        title="Excluir requisição"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Clinical indication */}
                    <div className="rounded-lg bg-muted/40 p-2.5 border border-border/60 text-xs">
                      <span className="font-semibold text-foreground">Indicação: </span>
                      <span className="text-muted-foreground">{order.clinicalIndication}</span>
                    </div>

                    {/* Markers requested */}
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Exames Solicitados ({order.markers.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {order.markers.map((m) => (
                          <span
                            key={m}
                            className="text-[11px] bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded-md border border-border/60"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyOrderWhatsApp(order)}
                      className="cursor-pointer text-xs gap-1.5"
                    >
                      {copiedOrderId === order.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedOrderId === order.id ? "Copiado!" : "WhatsApp"}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePrintOrder(order)}
                      className="cursor-pointer text-xs gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" /> Imprimir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals & Detail Drawer */}
      <ExamRegistryModal
        isOpen={isRegistryModalOpen}
        onClose={() => setIsRegistryModalOpen(false)}
        clients={clients}
        defaultClientId={selectedClientId !== "ALL" ? selectedClientId : undefined}
        onSubmit={registerExam}
      />

      <ExamOrderIssuerModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        clients={clients}
        defaultClientId={selectedClientId !== "ALL" ? selectedClientId : undefined}
        onSubmit={issueOrder}
      />

      <LabExamDetailDrawer
        exam={selectedExamForDetail}
        isOpen={!!selectedExamForDetail}
        onClose={() => setSelectedExamForDetail(null)}
        onDelete={deleteExam}
        onOpenChart={(clientId) => {
          setSelectedClientId(clientId)
          setActiveTab("longitudinal")
        }}
      />
    </div>
  )
}
