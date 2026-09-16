"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ConsolidatedLabExam,
  ConsolidatedLabMarker,
} from "@/types/lab-exam"
import {
  FlaskConical,
  Calendar,
  Building,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  TrendingUp,
} from "lucide-react"

interface LabExamDetailDrawerProps {
  exam: ConsolidatedLabExam | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (examId: string) => void
  onOpenChart?: (clientId: string) => void
}

export const LabExamDetailDrawer: React.FC<LabExamDetailDrawerProps> = ({
  exam,
  isOpen,
  onClose,
  onDelete,
  onOpenChart,
}) => {
  if (!exam) return null

  // Group markers by category
  const categoriesMap = new Map<string, ConsolidatedLabMarker[]>()
  exam.markers.forEach((m) => {
    const cat = m.reference?.category || "OUTROS"
    if (!categoriesMap.has(cat)) {
      categoriesMap.set(cat, [])
    }
    categoriesMap.get(cat)!.push(m)
  })

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

  const alteredMarkersCount = exam.markers.filter(
    (m) => m.status === "ALERT" || m.status === "BORDERLINE"
  ).length

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir este laudo do paciente ${exam.clientName}?`)) {
      if (onDelete) onDelete(exam.id)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="space-y-3 pb-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-primary">
              <FlaskConical className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Prontuário Bioquímico Completo
              </span>
            </div>
            {exam.hasAlerts ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 w-fit">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {alteredMarkersCount} {alteredMarkersCount === 1 ? "marcador fora do ótimo" : "marcadores fora do ótimo"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Todos os biomarcadores em faixa ideal
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {exam.clientName}
            </DialogTitle>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-secondary/60 px-2.5 py-1 rounded-md border border-border/50">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>
                  Coleta em:{" "}
                  <strong className="text-foreground">
                    {new Date(`${exam.date}T12:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>

              {exam.laboratoryName && (
                <div className="flex items-center gap-1.5 bg-secondary/60 px-2.5 py-1 rounded-md border border-border/50">
                  <Building className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Laboratório: <strong className="text-foreground">{exam.laboratoryName}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* PDF Attachment Banner */}
          {exam.pdfAttachment && (
            <div className="rounded-xl bg-secondary/40 border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {exam.pdfAttachment.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Documento original anexado • {Math.round(exam.pdfAttachment.sizeBytes / 1024)} KB • Armazenamento clínico seguro
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  alert(`Acesso seguro ao arquivo: ${exam.pdfAttachment?.name}`)
                }}
                className="cursor-pointer text-xs gap-1.5 shrink-0 bg-background hover:bg-secondary"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir Laudo Original
              </Button>
            </div>
          )}

          {/* Clinical Notes */}
          {exam.notes && (
            <div className="rounded-xl bg-muted/40 border border-border p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Anotações e Conduta Nutricional
              </div>
              <p className="text-sm text-foreground leading-relaxed font-normal">{exam.notes}</p>
            </div>
          )}

          {/* Biomarkers Categorized - Wide Open Table Layout */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Painel Completo de Biomarcadores Analisados ({exam.markers.length})
              </h4>
              <span className="text-xs text-muted-foreground">
                Diretrizes de Referência SBPC/ML & Sociedades Brasileiras
              </span>
            </div>

            {Array.from(categoriesMap.entries()).map(([catKey, markers]) => (
              <div key={catKey} className="rounded-xl border border-border overflow-hidden shadow-xs">
                {/* Category Header */}
                <div className="bg-muted/70 px-4 py-2.5 text-xs font-bold text-foreground border-b border-border flex items-center justify-between">
                  <span className="uppercase tracking-wider">{categoryLabels[catKey] || catKey}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {markers.length} {markers.length === 1 ? "marcador" : "marcadores"}
                  </span>
                </div>

                {/* Table Header */}
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
                        className="px-4 py-3 bg-card hover:bg-muted/15 transition-colors flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 sm:items-center text-xs"
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
                          <span className="text-base sm:text-lg font-bold text-foreground">
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
                            <span className="text-muted-foreground/70">Padrão laboratorial</span>
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

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onOpenChart && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChart(exam.clientId)
                    onClose()
                  }}
                  className="cursor-pointer text-xs gap-1.5 flex-1 sm:flex-none"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> Ver no Gráfico Longitudinal
                </Button>
              )}

              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-muted-foreground hover:text-rose-500 text-xs gap-1.5 cursor-pointer flex-1 sm:flex-none"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir Laudo
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer text-xs w-full sm:w-auto"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
