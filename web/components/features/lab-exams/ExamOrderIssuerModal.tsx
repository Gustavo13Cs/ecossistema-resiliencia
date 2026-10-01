"use client"

import React, { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Send,
} from "lucide-react"
import {
  LAB_ORDER_TEMPLATES,
  LabOrderTemplate,
  ClientOption,
  IssueOrderInput,
  IssuedLabOrder,
} from "@/types/lab-exam"
import { toast } from "sonner"

interface ExamOrderIssuerModalProps {
  isOpen: boolean
  onClose: () => void
  clients: ClientOption[]
  defaultClientId?: string
  onSubmit: (data: IssueOrderInput) => Promise<IssuedLabOrder>
}

export const ExamOrderIssuerModal: React.FC<ExamOrderIssuerModalProps> = ({
  isOpen,
  onClose,
  clients,
  defaultClientId,
  onSubmit,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    defaultClientId || (clients[0]?.id ?? "")
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(LAB_ORDER_TEMPLATES[0].id)
  const [customMarkerInput, setCustomMarkerInput] = useState<string>("")
  const [markersList, setMarkersList] = useState<string[]>([
    ...LAB_ORDER_TEMPLATES[0].suggestedMarkers,
  ])
  const [clinicalIndication, setClinicalIndication] = useState<string>(
    "Acompanhamento nutricional periódico e rastreamento de biomarcadores metabólicos."
  )
  const [preparationInstructions, setPreparationInstructions] = useState<string>(
    "Jejum de 10 a 12 horas. Ingestão de água permitida em moderação. Evitar bebidas alcoólicas e exercícios vigorosos nas 24h antecedentes à coleta."
  )
  const [submitting, setSubmitting] = useState(false)
  const submissionPending = useRef(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleTemplateSelect = (tmpl: LabOrderTemplate) => {
    setSelectedTemplateId(tmpl.id)
    setMarkersList([...tmpl.suggestedMarkers])
    setClinicalIndication(`Investigação clínica e ${tmpl.title.toLowerCase()} para plano alimentar individualizado.`)
  }

  const addCustomMarker = () => {
    const trimmed = customMarkerInput.trim()
    if (!trimmed) return
    if (!markersList.includes(trimmed)) {
      setMarkersList([...markersList, trimmed])
      setCustomMarkerInput("")
    } else {
      toast.info("Marcador já está na lista.")
    }
  }

  const removeMarker = (name: string) => {
    setMarkersList(markersList.filter((m) => m !== name))
  }

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submissionPending.current) return
    if (!selectedClientId) {
      toast.error("Selecione um paciente.")
      return
    }
    if (markersList.length === 0) {
      toast.error("Selecione pelo menos um biomarcador para a requisição.")
      return
    }

    const tmpl = LAB_ORDER_TEMPLATES.find((t: LabOrderTemplate) => t.id === selectedTemplateId)
    submissionPending.current = true
    setSubmitting(true)
    setSaveError(null)
    try {
      await onSubmit({
        clientId: selectedClientId,
        templateTitle: tmpl?.title,
        markers: markersList,
        clinicalIndication,
        preparationInstructions,
      })
      onClose()
    } catch {
      setSaveError("Não foi possível salvar o pedido. Seus dados continuam neste formulário.")
    } finally {
      submissionPending.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submissionPending.current) onClose() }}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Prescrição Laboratorial</span>
          </div>
          <DialogTitle className="text-xl font-bold">Emitir Pedido de Exames Padronizado</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecione protocolos clínicos recomendados ou personalize os marcadores solicitados para o paciente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveOrder} className="pt-2"><fieldset disabled={submitting} className="space-y-5">
          {/* Patient Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Paciente <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              <option value="" disabled>
                Selecione um paciente...
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Protocols / Templates Carousel */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Modelos de Pedidos Padronizados:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {LAB_ORDER_TEMPLATES.map((tmpl: LabOrderTemplate) => {
                const isSelected = selectedTemplateId === tmpl.id
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleTemplateSelect(tmpl)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground">{tmpl.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {tmpl.description}
                    </div>
                    <div className="mt-2 text-[10px] font-medium text-primary">
                      {tmpl.suggestedMarkers.length} biomarcadores sugeridos
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Markers tags & add custom */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Biomarcadores Incluídos ({markersList.length})
              </label>
              <span className="text-[11px] text-muted-foreground">Clique para remover</span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-border bg-muted/20 min-h-[60px]">
              {markersList.map((marker) => (
                <span
                  key={marker}
                  onClick={() => removeMarker(marker)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-background hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 px-2.5 py-1 rounded-md border border-border transition-colors cursor-pointer"
                >
                  <span>{marker}</span>
                  <Trash2 className="h-3 w-3 opacity-60 hover:opacity-100" />
                </span>
              ))}
            </div>

            {/* Input to add custom marker */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Digitar outro biomarcador para adicionar à requisição..."
                value={customMarkerInput}
                onChange={(e) => setCustomMarkerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
    if (submissionPending.current) return
                    addCustomMarker()
                  }
                }}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomMarker}
                className="cursor-pointer text-xs shrink-0 gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
          </div>

          {/* Clinical Indication */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Indicação Clínica
            </label>
            <Input
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="Ex: Rastreamento metabólico para ajuste de plano nutricional."
              className="text-xs"
            />
          </div>

          {/* Preparation Instructions */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Orientações de Coleta & Preparo
            </label>
            <Textarea
              value={preparationInstructions}
              onChange={(e) => setPreparationInstructions(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <p className="text-xs text-muted-foreground">Depois de registrar, copie ou imprima o pedido na lista de pedidos emitidos.</p>
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="cursor-pointer text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Registrar Pedido
              </Button>
            </div>
          </div>
        </fieldset></form>
      </DialogContent>
    </Dialog>
  )
}
