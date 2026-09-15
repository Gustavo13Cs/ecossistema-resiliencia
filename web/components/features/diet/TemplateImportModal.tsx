"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useClients } from "@/hooks/features/useClients"
import { useDietTemplateMutations, type DietTemplate } from "@/hooks/features/useDietTemplates"
import {
  Search,
  Sparkles,
  ArrowRight,
  User,
  Scale,
  Flame,
  Check,
  Percent,
  Layers,
  Loader2,
  Info,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface TemplateImportModalProps {
  template: DietTemplate | null
  isOpen: boolean
  onClose: () => void
  initialClientId?: string
}

export function TemplateImportModal({
  template,
  isOpen,
  onClose,
  initialClientId,
}: TemplateImportModalProps) {
  const router = useRouter()
  const { data: clients = [], isLoading: isLoadingClients } = useClients("ACTIVE")
  const { importTemplateToClient } = useDietTemplateMutations()

  const [searchClient, setSearchClient] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || "")
  const [customTitle, setCustomTitle] = useState("")
  const [targetKcal, setTargetKcal] = useState<number>(template?.targetKcal || 2000)

  // Atualiza targetKcal inicial quando o template muda
  const baseKcal = template?.targetKcal || 2000
  const activeKcal = targetKcal || baseKcal
  const scaleFactor = activeKcal / baseKcal

  // Clientes filtrados na busca
  const filteredClients = useMemo(() => {
    if (!searchClient.trim()) return clients.slice(0, 8)
    const term = searchClient.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.goal && c.goal.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    )
  }, [clients, searchClient])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  )

  // Macros recalculados com auto-scaling proporcional
  const scaledMacros = useMemo(() => {
    if (!template) return { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
    return {
      proteinG: Math.round(template.proteinG * scaleFactor),
      carbsG: Math.round(template.carbsG * scaleFactor),
      fatG: Math.round(template.fatG * scaleFactor),
      fiberG: template.fiberG ? Math.round(template.fiberG * scaleFactor) : null,
    }
  }, [template, scaleFactor])

  const handleApplyKcalPreset = (percentageDiff: number) => {
    const newKcal = Math.round((baseKcal * (1 + percentageDiff / 100)) / 50) * 50
    setTargetKcal(newKcal)
  }

  const handleConfirmImport = async () => {
    if (!template || !selectedClientId) return

    await importTemplateToClient.mutateAsync({
      templateId: template.id,
      clientId: selectedClientId,
      targetKcal: activeKcal,
      title: customTitle.trim() || `${template.title} (Adaptado)`,
    })

    onClose()
    router.push(`/clientes/${selectedClientId}`)
  }

  if (!template) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white rounded-t-lg">
          <div className="flex items-center gap-2 text-teal-100 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Importação Inteligente com Auto-Scaling
          </div>
          <DialogTitle className="text-2xl font-bold text-white mt-1">
            {template.title}
          </DialogTitle>
          <DialogDescription className="text-teal-50 text-sm mt-1">
            Selecione o cliente e calibre as calorias desejadas. As porções de todos os alimentos
            serão ajustadas automaticamente mantendo a proporção de macronutrientes.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* PASSO 1: Seleção de Cliente */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                1. Selecionar Cliente do Prontuário
              </span>
              {selectedClient && (
                <span className="text-xs text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Selecionado: {selectedClient.name}
                </span>
              )}
            </Label>

            {/* Campo de busca de cliente */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar cliente por nome ou objetivo..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="pl-9 h-10 border-slate-200"
              />
            </div>

            {/* Lista de clientes para clique rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 border border-slate-100 rounded-lg p-1.5 bg-slate-50/60">
              {isLoadingClients ? (
                <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                  Carregando clientes...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                  Nenhum cliente encontrado.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientId === client.id
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(client.id)
                        if (!customTitle) {
                          setCustomTitle(`${template.title} - ${client.name.split(" ")[0]}`)
                        }
                      }}
                      className={`text-left p-2.5 rounded-md text-xs transition-all border flex items-center justify-between ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-900 font-semibold shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium">{client.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {client.goal || "Sem meta cadastrada"}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* PASSO 2: Motor de Ajuste de Calorias & Auto-Scaling */}
          <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" />
                2. Calibragem Calórica & Auto-Scaling de Porções
              </Label>
              <Badge variant="outline" className="text-xs font-mono bg-white text-teal-700 border-teal-300">
                Fator: {scaleFactor.toFixed(2)}x ({scaleFactor >= 1 ? `+${Math.round((scaleFactor - 1) * 100)}%` : `${Math.round((scaleFactor - 1) * 100)}%`})
              </Badge>
            </div>

            {/* Comparativo de Calorias */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">
                  Calorias do Modelo Base
                </span>
                <span className="text-xl font-bold text-slate-700">{baseKcal} kcal</span>
              </div>
              <div className="p-3 bg-teal-600 text-white rounded-lg shadow-xs">
                <span className="text-[11px] font-medium text-teal-100 block uppercase">
                  Meta Alvo do Cliente
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{activeKcal}</span>
                  <span className="text-xs text-teal-200">kcal/dia</span>
                </div>
              </div>
            </div>

            {/* Slider de Calorias */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>1.200 kcal</span>
                <span className="font-semibold text-teal-700">{activeKcal} kcal</span>
                <span>3.800 kcal</span>
              </div>
              <Slider
                value={[activeKcal]}
                min={1200}
                max={3800}
                step={50}
                onValueChange={(vals) => setTargetKcal(vals[0])}
                className="py-1 cursor-pointer"
              />
            </div>

            {/* Botões Rápidos de Preset */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => handleApplyKcalPreset(-20)}
                className="px-2.5 py-1 text-xs rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
              >
                -20% Déficit
              </button>
              <button
                type="button"
                onClick={() => handleApplyKcalPreset(-15)}
                className="px-2.5 py-1 text-xs rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
              >
                -15% Déficit
              </button>
              <button
                type="button"
                onClick={() => setTargetKcal(baseKcal)}
                className="px-2.5 py-1 text-xs rounded bg-white hover:bg-slate-100 border border-slate-200 text-teal-700 font-semibold"
              >
                Original (100%)
              </button>
              <button
                type="button"
                onClick={() => handleApplyKcalPreset(10)}
                className="px-2.5 py-1 text-xs rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
              >
                +10% Superávit
              </button>
              <button
                type="button"
                onClick={() => handleApplyKcalPreset(20)}
                className="px-2.5 py-1 text-xs rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
              >
                +20% Bulking
              </button>
            </div>

            {/* Comparativo de Macronutrientes antes vs depois */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-100">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-sky-600 block">Proteína</span>
                <div className="text-sm font-bold text-slate-800">{scaledMacros.proteinG}g</div>
                <span className="text-[10px] text-slate-400">
                  base: {template.proteinG}g
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Carboidrato</span>
                <div className="text-sm font-bold text-slate-800">{scaledMacros.carbsG}g</div>
                <span className="text-[10px] text-slate-400">
                  base: {template.carbsG}g
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Gorduras</span>
                <div className="text-sm font-bold text-slate-800">{scaledMacros.fatG}g</div>
                <span className="text-[10px] text-slate-400">
                  base: {template.fatG}g
                </span>
              </div>
            </div>
          </div>

          {/* PASSO 3: Título Personalizado para o Prontuário */}
          <div className="space-y-1.5">
            <Label htmlFor="customTitle" className="text-xs font-semibold text-slate-700">
              Título da Prescrição no Prontuário (Opcional)
            </Label>
            <Input
              id="customTitle"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={`Ex: ${template.title} (Fase 1)`}
              className="h-10 text-sm"
            />
          </div>

          {/* Amostra das refeições incluídas */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              {template.meals.length} Refeições que serão inseridas no prontuário:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {template.meals.map((meal, idx) => (
                <Badge key={idx} variant="secondary" className="text-[11px] font-normal bg-white border border-slate-200 text-slate-700">
                  {meal.name} {meal.time ? `(${meal.time})` : ""} · {meal.items.length} itens
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex sm:justify-between items-center gap-3">
          <Button variant="outline" onClick={onClose} disabled={importTemplateToClient.isPending}>
            Cancelar
          </Button>

          <Button
            onClick={handleConfirmImport}
            disabled={!selectedClientId || importTemplateToClient.isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-10 px-5 shadow-sm"
          >
            {importTemplateToClient.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aplicando ao prontuário...
              </>
            ) : (
              <>
                Confirmar e Aplicar ao Prontuário
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
