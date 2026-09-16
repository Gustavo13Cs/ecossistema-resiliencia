"use client"

import React, { useState } from "react"
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
  Plus,
  Trash2,
  Upload,
  FileText,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import {
  CLINICAL_MARKERS_DICTIONARY,
  evaluateMarkerValue,
  ClientOption,
} from "@/types/lab-exam"
import { toast } from "sonner"

interface ExamRegistryModalProps {
  isOpen: boolean
  onClose: () => void
  clients: ClientOption[]
  defaultClientId?: string
  onSubmit: (data: {
    clientId: string
    clientName: string
    date: string
    laboratoryName?: string
    notes?: string
    markers: { name: string; value: number; unit: string }[]
    pdfAttachment?: { name: string; sizeBytes: number; uploadedAt: string }
  }) => Promise<any>
}

interface MarkerRow {
  name: string
  value: string
  unit: string
}

export const ExamRegistryModal: React.FC<ExamRegistryModalProps> = ({
  isOpen,
  onClose,
  clients,
  defaultClientId,
  onSubmit,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    defaultClientId || (clients[0]?.id ?? "")
  )
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [laboratoryName, setLaboratoryName] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Markers state
  const [markers, setMarkers] = useState<MarkerRow[]>([
    { name: "Glicemia de Jejum", value: "89", unit: "mg/dL" },
    { name: "Hemoglobina Glicada (HbA1c)", value: "5.2", unit: "%" },
    { name: "Colesterol Total", value: "185", unit: "mg/dL" },
    { name: "HDL Colesterol", value: "54", unit: "mg/dL" },
    { name: "LDL Colesterol", value: "105", unit: "mg/dL" },
    { name: "Triglicerídeos", value: "120", unit: "mg/dL" },
  ])

  // PDF upload simulation
  const [attachedPdf, setAttachedPdf] = useState<{
    name: string
    sizeBytes: number
    uploadedAt: string
  } | null>(null)

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      if (defaultClientId) {
        setSelectedClientId(defaultClientId)
      } else if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id)
      }
    }
  }, [isOpen, defaultClientId, clients, selectedClientId])

  const handleMarkerChange = (index: number, field: keyof MarkerRow, val: string) => {
    const updated = [...markers]
    updated[index] = { ...updated[index], [field]: val }

    // If marker name changed and is in dictionary, auto-populate unit
    if (field === "name" && CLINICAL_MARKERS_DICTIONARY[val]) {
      updated[index].unit = CLINICAL_MARKERS_DICTIONARY[val].unit
    }

    setMarkers(updated)
  }

  const addMarkerRow = (presetName?: string) => {
    const name = presetName || ""
    const unit = presetName && CLINICAL_MARKERS_DICTIONARY[presetName] ? CLINICAL_MARKERS_DICTIONARY[presetName].unit : "mg/dL"
    setMarkers([...markers, { name, value: "", unit }])
  }

  const removeMarkerRow = (index: number) => {
    setMarkers(markers.filter((_, i) => i !== index))
  }

  const addPresetGroup = (group: "LIPID" | "GLYCEMIC" | "THYROID" | "VITAMINS") => {
    const presets: Record<string, string[]> = {
      LIPID: ["Colesterol Total", "HDL Colesterol", "LDL Colesterol", "Triglicerídeos"],
      GLYCEMIC: ["Glicemia de Jejum", "Hemoglobina Glicada (HbA1c)", "Insulina Basal"],
      THYROID: ["TSH Ultra Sensível", "T4 Livre"],
      VITAMINS: ["25-OH Vitamina D", "Vitamina B12", "Ferritina"],
    }

    const toAdd = presets[group] || []
    const existingNames = new Set(markers.map((m) => m.name))
    const newRows: MarkerRow[] = []

    toAdd.forEach((name) => {
      if (!existingNames.has(name)) {
        const ref = CLINICAL_MARKERS_DICTIONARY[name]
        newRows.push({
          name,
          value: "",
          unit: ref?.unit || "mg/dL",
        })
      }
    })

    if (newRows.length > 0) {
      setMarkers([...markers, ...newRows])
      toast.info(`${newRows.length} marcadores adicionados.`)
    } else {
      toast.info("Marcadores deste grupo já estão na lista.")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith(".pdf") && !file.type.includes("pdf")) {
        toast.error("Por favor, selecione um arquivo em formato PDF.")
        return
      }
      setAttachedPdf({
        name: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString().split("T")[0],
      })
      toast.success(`Laudo anexado: ${file.name}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClientId) {
      toast.error("Selecione um cliente.")
      return
    }

    const validMarkers = markers
      .filter((m) => m.name.trim() && !isNaN(Number(m.value)) && m.value.trim() !== "")
      .map((m) => ({
        name: m.name.trim(),
        value: Number(m.value),
        unit: m.unit.trim() || "mg/dL",
      }))

    if (validMarkers.length === 0) {
      toast.error("Adicione ao menos um marcador com valor numérico válido.")
      return
    }

    const client = clients.find((c) => c.id === selectedClientId)
    const clientName = client ? client.name : "Paciente"

    setSubmitting(true)
    try {
      await onSubmit({
        clientId: selectedClientId,
        clientName,
        date,
        laboratoryName: laboratoryName.trim() || undefined,
        notes: notes.trim() || undefined,
        markers: validMarkers,
        pdfAttachment: attachedPdf || undefined,
      })
      onClose()
    } catch {
      // Handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const dictionaryOptions = Object.keys(CLINICAL_MARKERS_DICTIONARY).sort()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <FlaskConical className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Novo Registro</span>
          </div>
          <DialogTitle className="text-xl font-bold">Cadastrar Laudo de Exames Laboratoriais</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Insira os biomarcadores do laudo recebido para alimentar a evolução clínica e gráficos comparativos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Header Row: Client, Date, Lab */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Paciente / Cliente <span className="text-rose-500">*</span>
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

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Data da Coleta <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Laboratório
              </label>
              <Input
                placeholder="Ex: Fleury, Dasa, Sabin..."
                value={laboratoryName}
                onChange={(e) => setLaboratoryName(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="rounded-lg bg-muted/40 p-3 border border-border/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Inserir grupo de biomarcadores frequentes:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => addPresetGroup("LIPID")}
                className="text-xs bg-background hover:bg-secondary px-2.5 py-1 rounded-md border border-border text-foreground transition-colors cursor-pointer"
              >
                + Perfil Lipídico
              </button>
              <button
                type="button"
                onClick={() => addPresetGroup("GLYCEMIC")}
                className="text-xs bg-background hover:bg-secondary px-2.5 py-1 rounded-md border border-border text-foreground transition-colors cursor-pointer"
              >
                + Glicemia & Insulina
              </button>
              <button
                type="button"
                onClick={() => addPresetGroup("THYROID")}
                className="text-xs bg-background hover:bg-secondary px-2.5 py-1 rounded-md border border-border text-foreground transition-colors cursor-pointer"
              >
                + Painel Tireoidiano
              </button>
              <button
                type="button"
                onClick={() => addPresetGroup("VITAMINS")}
                className="text-xs bg-background hover:bg-secondary px-2.5 py-1 rounded-md border border-border text-foreground transition-colors cursor-pointer"
              >
                + Vitaminas & Minerais
              </button>
            </div>
          </div>

          {/* Markers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Marcadores Bioquímicos ({markers.length})
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addMarkerRow()}
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Marcador
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {markers.map((row, idx) => {
                const numVal = parseFloat(row.value)
                const status = !isNaN(numVal) && row.name ? evaluateMarkerValue(row.name, numVal) : null

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-border/80 bg-card hover:border-border transition-colors text-xs"
                  >
                    {/* Marker Name with datalist suggestions */}
                    <div className="flex-1">
                      <input
                        list="markers-dictionary"
                        value={row.name}
                        onChange={(e) => handleMarkerChange(idx, "name", e.target.value)}
                        placeholder="Nome do marcador (ex: Glicemia, Ferritina...)"
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                      />
                    </div>

                    {/* Value */}
                    <div className="w-24">
                      <Input
                        type="number"
                        step="any"
                        value={row.value}
                        onChange={(e) => handleMarkerChange(idx, "value", e.target.value)}
                        placeholder="Valor"
                        className="h-8 text-xs font-semibold"
                      />
                    </div>

                    {/* Unit */}
                    <div className="w-20">
                      <Input
                        value={row.unit}
                        onChange={(e) => handleMarkerChange(idx, "unit", e.target.value)}
                        placeholder="Unidade"
                        className="h-8 text-xs text-muted-foreground"
                      />
                    </div>

                    {/* Status Preview badge */}
                    <div className="w-28 flex items-center justify-center">
                      {status === "OPTIMAL" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="h-3 w-3" /> Ótimo
                        </span>
                      )}
                      {status === "BORDERLINE" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="h-3 w-3" /> Limítrofe
                        </span>
                      )}
                      {status === "ALERT" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="h-3 w-3" /> Fora Faixa
                        </span>
                      )}
                      {!status && <span className="text-[11px] text-muted-foreground">—</span>}
                    </div>

                    {/* Remove button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMarkerRow(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-500 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Datalist for marker suggestions */}
            <datalist id="markers-dictionary">
              {dictionaryOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>

          {/* PDF Upload Simulator */}
          <div className="rounded-lg border border-dashed border-border p-4 bg-muted/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Anexo de Laudo Digital (PDF)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Armazenamento seguro do laudo escaneado ou original emitido pelo laboratório
                  </p>
                </div>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-md border border-border transition-colors">
                  <FileText className="h-3.5 w-3.5" />
                  {attachedPdf ? "Trocar Arquivo" : "Selecionar PDF"}
                </span>
              </label>
            </div>

            {attachedPdf && (
              <div className="mt-3 flex items-center justify-between bg-card rounded-md p-2.5 border border-border text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-foreground">{attachedPdf.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({Math.round(attachedPdf.sizeBytes / 1024)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedPdf(null)}
                  className="text-muted-foreground hover:text-rose-500 text-xs cursor-pointer"
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Observações Clínicas & Condutas
            </label>
            <Textarea
              placeholder="Ex: Paciente em jejum de 12h. Ajustar consumo de gorduras saturadas e introduzir ômega 3..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="cursor-pointer text-xs gap-1.5"
            >
              {submitting ? "Salvando..." : "Registrar Laudo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
