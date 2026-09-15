"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  Flame,
  UserCheck,
  Archive,
  Copy,
  Edit2,
  Trash2,
  MoreVertical,
  ArrowRight,
  Utensils,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useDietTemplates,
  useSystemDietTemplates,
  useDietTemplateMutations,
  type DietTemplate,
} from "@/hooks/features/useDietTemplates"
import { TemplateImportModal } from "@/components/features/diet/TemplateImportModal"
import { TemplateDetailDrawer } from "@/components/features/diet/TemplateDetailDrawer"
import { TemplateFormModal } from "@/components/features/diet/TemplateFormModal"

type TabType = "all" | "custom" | "system" | "archived"
type CalorieRange = "all" | "under1600" | "1600to2000" | "2000to2400" | "over2400"

export default function ModelosPlanosPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGoal, setSelectedGoal] = useState<string>("all")
  const [selectedCalorieRange, setSelectedCalorieRange] = useState<CalorieRange>("all")

  // Carrega templates do profissional (ativos e arquivados)
  const { data: professionalTemplates = [], isLoading: isLoadingCustom } = useDietTemplates(
    activeTab === "archived" ? "archived" : "all"
  )
  // Carrega templates curados do sistema
  const { data: systemTemplates = [], isLoading: isLoadingSystem } = useSystemDietTemplates()

  const { duplicateTemplate, toggleArchiveTemplate, deleteTemplate } =
    useDietTemplateMutations()

  // Estados dos Modais
  const [importingTemplate, setImportingTemplate] = useState<DietTemplate | null>(null)
  const [viewingTemplate, setViewingTemplate] = useState<DietTemplate | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DietTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<DietTemplate | null>(null)

  // Armazena no localStorage os modelos curados arquivados ou excluídos pelo profissional
  const [archivedSystemIds, setArchivedSystemIds] = useState<string[]>([])
  const [deletedSystemIds, setDeletedSystemIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const storedArchived = localStorage.getItem("safemove_archived_system_templates")
      if (storedArchived) setArchivedSystemIds(JSON.parse(storedArchived))
      const storedDeleted = localStorage.getItem("safemove_deleted_system_templates")
      if (storedDeleted) setDeletedSystemIds(JSON.parse(storedDeleted))
    } catch {
      // ignore
    }
  }, [])

  // Processa os templates curados considerando arquivamento e exclusão
  const processedSystemTemplates = useMemo(() => {
    return systemTemplates
      .filter((t) => !deletedSystemIds.includes(t.id))
      .map((t) => ({
        ...t,
        isActive: !archivedSystemIds.includes(t.id),
      }))
  }, [systemTemplates, deletedSystemIds, archivedSystemIds])

  // Estatísticas Rápidas
  const activeCustomCount = professionalTemplates.filter((t) => t.isActive).length
  const archivedCustomCount =
    professionalTemplates.filter((t) => !t.isActive).length +
    processedSystemTemplates.filter((t) => !t.isActive).length
  const systemCount = processedSystemTemplates.filter((t) => t.isActive).length

  // Lista combinada e filtrada
  const filteredTemplates = useMemo(() => {
    let list: DietTemplate[] = []

    if (activeTab === "all") {
      // Templates do sistema ativos + templates ativos do profissional
      list = [
        ...processedSystemTemplates.filter((t) => t.isActive),
        ...professionalTemplates.filter((t) => t.isActive),
      ]
    } else if (activeTab === "custom") {
      list = professionalTemplates.filter((t) => t.isActive)
    } else if (activeTab === "system") {
      list = processedSystemTemplates.filter((t) => t.isActive)
    } else if (activeTab === "archived") {
      list = [
        ...processedSystemTemplates.filter((t) => !t.isActive),
        ...professionalTemplates.filter((t) => !t.isActive),
      ]
    }

    // Filtro de Busca Textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.goal.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.meals.some((m) =>
            m.items.some((it) => (it.name || it.food?.name || "").toLowerCase().includes(q))
          )
      )
    }

    // Filtro de Objetivo
    if (selectedGoal !== "all") {
      list = list.filter((t) => {
        const goalLower = t.goal.toLowerCase()
        const titleLower = t.title.toLowerCase()
        const catLower = (t.category || "").toLowerCase()

        if (selectedGoal === "EMAGRECIMENTO") {
          return (
            goalLower.includes("emagrecimento") ||
            goalLower.includes("déficit") ||
            catLower.includes("emagrecimento") ||
            titleLower.includes("emagrecimento")
          )
        }
        if (selectedGoal === "HIPERTROFIA") {
          return (
            goalLower.includes("hipertrofia") ||
            goalLower.includes("massa") ||
            catLower.includes("hipertrofia") ||
            titleLower.includes("hipertrofia")
          )
        }
        if (selectedGoal === "LOW_CARB") {
          return (
            goalLower.includes("low carb") ||
            catLower.includes("low_carb") ||
            titleLower.includes("low carb")
          )
        }
        if (selectedGoal === "CETOGENICA") {
          return (
            goalLower.includes("cetogênica") ||
            goalLower.includes("cetogenica") ||
            titleLower.includes("cetogênica")
          )
        }
        if (selectedGoal === "MANUTENCAO") {
          return (
            goalLower.includes("manutenção") ||
            goalLower.includes("normocalórica") ||
            catLower.includes("manutencao") ||
            titleLower.includes("normocalórica")
          )
        }
        if (selectedGoal === "VEGETARIANO") {
          return (
            goalLower.includes("vegetariano") ||
            goalLower.includes("vegetariano") ||
            titleLower.includes("vegetariano")
          )
        }
        return true
      })
    }

    // Filtro por Faixa Calórica
    if (selectedCalorieRange !== "all") {
      list = list.filter((t) => {
        if (selectedCalorieRange === "under1600") return t.targetKcal < 1600
        if (selectedCalorieRange === "1600to2000")
          return t.targetKcal >= 1600 && t.targetKcal <= 2000
        if (selectedCalorieRange === "2000to2400")
          return t.targetKcal > 2000 && t.targetKcal <= 2400
        if (selectedCalorieRange === "over2400") return t.targetKcal > 2400
        return true
      })
    }

    return list
  }, [
    activeTab,
    professionalTemplates,
    processedSystemTemplates,
    searchQuery,
    selectedGoal,
    selectedCalorieRange,
  ])

  const handleEditTemplate = async (template: DietTemplate) => {
    if (template.isSystem) {
      try {
        const toastId = toast.loading("Criando cópia editável no seu acervo...")
        const duplicated = await duplicateTemplate.mutateAsync(template.id)
        toast.dismiss(toastId)
        setEditingTemplate(duplicated)
        setIsFormModalOpen(true)
      } catch {
        toast.error("Não foi possível preparar o modelo para edição.")
      }
    } else {
      setEditingTemplate(template)
      setIsFormModalOpen(true)
    }
  }

  const handleToggleArchive = (template: DietTemplate) => {
    if (template.isSystem) {
      const isArchived = archivedSystemIds.includes(template.id)
      const updated = isArchived
        ? archivedSystemIds.filter((id) => id !== template.id)
        : [...archivedSystemIds, template.id]
      setArchivedSystemIds(updated)
      try {
        localStorage.setItem("safemove_archived_system_templates", JSON.stringify(updated))
      } catch {
        // ignore
      }
      if (isArchived) {
        toast.success("Modelo desarquivado e reativado!")
      } else {
        toast.success("Modelo arquivado com sucesso.")
      }
    } else {
      toggleArchiveTemplate.mutate(template.id)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return
    if (templateToDelete.isSystem) {
      const updated = [...deletedSystemIds, templateToDelete.id]
      setDeletedSystemIds(updated)
      try {
        localStorage.setItem("safemove_deleted_system_templates", JSON.stringify(updated))
      } catch {
        // ignore
      }
      toast.success("Modelo removido com sucesso.")
      setTemplateToDelete(null)
    } else {
      await deleteTemplate.mutateAsync(templateToDelete.id)
      setTemplateToDelete(null)
    }
  }

  const isLoading = isLoadingCustom || isLoadingSystem

  return (
    <div className="min-h-screen bg-slate-50/50 py-8">
      <div className="w-full px-6 md:px-10 lg:px-14 mx-auto space-y-8">
        {/* CABEÇALHO DA PÁGINA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Prescrição Rápida & Produtividade Clínica
            </div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              <Layers className="w-8 h-8 text-teal-600" />
              Modelos de Planos Alimentares
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Templates reutilizáveis de cardápios com auto-scaling inteligente de calorias e macros.
              Aplique modelos completos diretamente no prontuário de qualquer cliente em segundos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setEditingTemplate(null)
                setIsFormModalOpen(true)
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-2 h-11 px-5"
            >
              <Plus className="w-4 h-4" />
              Novo Modelo Próprio
            </Button>
          </div>
        </div>

        {/* ESTATÍSTICAS E ATALHOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-0 shadow-xs bg-white border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Disponíveis para Uso
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {activeCustomCount + systemCount}
              </div>
              <span className="text-[11px] text-teal-600 font-medium">
                Prontos para importação
              </span>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xs bg-white border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                SafeMove Curados
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">{systemCount}</div>
              <span className="text-[11px] text-emerald-600 font-medium">
                Baseados em evidências
              </span>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xs bg-white border-l-4 border-l-sky-500">
            <CardContent className="p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Modelos Próprios
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">{activeCustomCount}</div>
              <span className="text-[11px] text-sky-600 font-medium">
                Personalizados por você
              </span>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xs bg-white border-l-4 border-l-slate-400">
            <CardContent className="p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Modelos Arquivados
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">{archivedCustomCount}</div>
              <span className="text-[11px] text-slate-500 font-medium">
                Guardados no histórico
              </span>
            </CardContent>
          </Card>
        </div>

        {/* ABAS & BARRA DE FILTROS */}
        <div className="space-y-4">
          {/* Abas Superiores */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos ({activeCustomCount + systemCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "custom"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Meus Modelos ({activeCustomCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("system")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "system"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                SafeMove Curados ({systemCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("archived")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "archived"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Arquivados ({archivedCustomCount})
              </button>
            </div>
          </div>

          {/* Filtros em linha */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {/* Busca textual */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nome, objetivo, notas ou alimentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs border-slate-200 bg-slate-50/50"
              />
            </div>

            {/* Filtro por Objetivo */}
            <div className="sm:col-span-3">
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                aria-label="Filtrar por objetivo nutricional"
                className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">🎯 Todos os Objetivos</option>
                <option value="EMAGRECIMENTO">Emagrecimento / Déficit</option>
                <option value="HIPERTROFIA">Hipertrofia / Ganho de Massa</option>
                <option value="LOW_CARB">Low Carb Funcional</option>
                <option value="CETOGENICA">Cetogênica</option>
                <option value="MANUTENCAO">Normocalórica / Manutenção</option>
                <option value="VEGETARIANO">Vegetariano / Plant-Based</option>
              </select>
            </div>

            {/* Filtro por Faixa Calórica */}
            <div className="sm:col-span-3">
              <select
                value={selectedCalorieRange}
                onChange={(e) => setSelectedCalorieRange(e.target.value as CalorieRange)}
                aria-label="Filtrar por faixa calórica"
                className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-slate-50/50 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">🔥 Todas as Faixas Calóricas</option>
                <option value="under1600">&lt; 1.600 kcal</option>
                <option value="1600to2000">1.600 a 2.000 kcal</option>
                <option value="2000to2400">2.000 a 2.400 kcal</option>
                <option value="over2400">&gt; 2.400 kcal</option>
              </select>
            </div>
          </div>
        </div>

        {/* GRID DE CARDS DOS TEMPLATES */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Carregando modelos de planos...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhum modelo encontrado
            </h3>
            <p className="text-xs text-slate-500">
              Ajuste os filtros de pesquisa ou crie o seu primeiro modelo personalizado
              clicando no botão abaixo.
            </p>
            <Button
              onClick={() => {
                setEditingTemplate(null)
                setIsFormModalOpen(true)
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Novo Modelo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const protPct = Math.round(((template.proteinG * 4) / template.targetKcal) * 100)
              const carbPct = Math.round(((template.carbsG * 4) / template.targetKcal) * 100)
              const fatPct = Math.round(((template.fatG * 9) / template.targetKcal) * 100)

              return (
                <Card
                  key={template.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header do Card com Badges */}
                    <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {template.isSystem ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                              <Sparkles className="w-3 h-3 mr-1" /> SafeMove Curado
                            </Badge>
                          ) : (
                            <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-semibold">
                              Modelo Próprio
                            </Badge>
                          )}
                          {!template.isActive && (
                            <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                              Arquivado
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-teal-700 transition-colors">
                          {template.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {template.goal}
                        </p>
                      </div>

                      {/* Dropdown de Ações */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => duplicateTemplate.mutate(template.id)}>
                            <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Duplicar / Nova Versão
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Editar Modelo
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleToggleArchive(template)}>
                            <Archive className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            {template.isActive ? "Arquivar Modelo" : "Desarquivar Modelo"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setTemplateToDelete(template)}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Excluir Modelo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Destaque Nutricional */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Meta Calórica
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-800">
                              {template.targetKcal}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">kcal/dia</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Estrutura
                          </span>
                          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Utensils className="w-3 h-3 text-teal-600" />
                            {template.meals.length} refeições
                          </span>
                        </div>
                      </div>

                      {/* Barra de Proporção de Macros */}
                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-100">
                          <div
                            style={{ width: `${protPct}%` }}
                            className="bg-sky-500 h-full"
                            title={`Proteína: ${protPct}%`}
                          />
                          <div
                            style={{ width: `${carbPct}%` }}
                            className="bg-amber-500 h-full"
                            title={`Carboidratos: ${carbPct}%`}
                          />
                          <div
                            style={{ width: `${fatPct}%` }}
                            className="bg-rose-500 h-full"
                            title={`Gorduras: ${fatPct}%`}
                          />
                        </div>

                        <div className="grid grid-cols-3 text-center text-[11px] pt-1">
                          <div className="text-sky-700 font-medium">
                            <span className="font-bold">{template.proteinG}g</span> P ({protPct}%)
                          </div>
                          <div className="text-amber-700 font-medium">
                            <span className="font-bold">{template.carbsG}g</span> C ({carbPct}%)
                          </div>
                          <div className="text-rose-700 font-medium">
                            <span className="font-bold">{template.fatG}g</span> G ({fatPct}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé com Ações Principais */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingTemplate(template)}
                      className="text-xs text-slate-600 hover:text-slate-900 h-9 px-3"
                    >
                      Ver Detalhes
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setImportingTemplate(template)}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 px-4 shadow-xs gap-1.5 font-medium"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Importar para Cliente
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL DE IMPORTAÇÃO RÁPIDA COM AUTO-SCALING */}
      {importingTemplate && (
        <TemplateImportModal
          template={importingTemplate}
          isOpen={Boolean(importingTemplate)}
          onClose={() => setImportingTemplate(null)}
        />
      )}

      {/* DRAWER DE DETALHES COMPLETOS */}
      {viewingTemplate && (
        <TemplateDetailDrawer
          template={viewingTemplate}
          isOpen={Boolean(viewingTemplate)}
          onClose={() => setViewingTemplate(null)}
          onImportClick={(t) => setImportingTemplate(t)}
        />
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <TemplateFormModal
        templateToEdit={editingTemplate}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingTemplate(null)
        }}
      />

      {/* ALERTA DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(templateToDelete)}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo de plano alimentar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o modelo &quot;{templateToDelete?.title}&quot;.
              As prescrições já criadas nos prontuários dos clientes que usaram este modelo
              permanecerão intactas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
