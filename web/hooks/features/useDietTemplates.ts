import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export interface DietTemplateMealItem {
  id?: string
  foodId?: string
  name?: string
  quantity: number
  measure: string
  notes?: string | null
  food?: {
    id: string
    name: string
    kcal: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
  }
}

export interface DietTemplateMeal {
  id?: string
  name: string
  time?: string | null
  notes?: string | null
  items: DietTemplateMealItem[]
}

export interface DietTemplate {
  id: string
  title: string
  goal: string
  category?: string
  targetKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG?: number | null
  sodiumMg?: number | null
  calciumMg?: number | null
  ironMg?: number | null
  notes?: string | null
  durationDays?: number
  isTemplate: boolean
  isSystem?: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  meals: DietTemplateMeal[]
}

export interface CreateTemplatePayload {
  title: string
  goal: string
  targetKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG?: number
  notes?: string
  durationDays?: number
  meals: Array<{
    name: string
    time?: string
    notes?: string
    items: Array<{
      foodId: string
      quantity: number
      measure: string
      notes?: string
    }>
  }>
}

export interface ScaleAndImportPayload {
  templateId: string
  clientId: string
  targetKcal?: number
  title?: string
  notes?: string
  durationDays?: number
}

const TEMPLATES_QUERY_KEY = ["diet-templates"] as const
const SYSTEM_TEMPLATES_QUERY_KEY = ["diet-system-templates"] as const

export function useDietTemplates(status: "all" | "active" | "archived" = "active") {
  const { user } = useAuth()

  return useQuery({
    queryKey: [...TEMPLATES_QUERY_KEY, user?.sub, status],
    queryFn: async () => {
      const response = await api.get<DietTemplate[]>(`/diet-plans/templates?status=${status}`)
      return response.data || []
    },
    enabled: Boolean(user?.sub),
  })
}

export function useSystemDietTemplates() {
  return useQuery({
    queryKey: SYSTEM_TEMPLATES_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<DietTemplate[]>("/diet-plans/system-templates")
      return response.data || []
    },
    staleTime: 1000 * 60 * 60, // 1 hora de cache pois templates de sistema são fixos
  })
}

export function useDietTemplateMutations() {
  const queryClient = useQueryClient()

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY })
  }

  const createTemplate = useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const response = await api.post<DietTemplate>("/diet-plans/template", payload)
      return response.data
    },
    onSuccess: () => {
      invalidateTemplates()
      toast.success("Modelo de plano criado com sucesso!")
    },
    onError: () => {
      toast.error("Erro ao criar modelo de plano.")
    },
  })

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTemplatePayload> }) => {
      const response = await api.put<DietTemplate>(`/diet-plans/template/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      invalidateTemplates()
      toast.success("Modelo atualizado com sucesso!")
    },
    onError: () => {
      toast.error("Erro ao atualizar modelo.")
    },
  })

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await api.post<DietTemplate>(`/diet-plans/template/${templateId}/duplicate`)
      return response.data
    },
    onSuccess: (data) => {
      invalidateTemplates()
      toast.success(`Modelo duplicado com sucesso! (${data.title})`)
    },
    onError: () => {
      toast.error("Erro ao duplicar modelo.")
    },
  })

  const toggleArchiveTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await api.patch<DietTemplate>(`/diet-plans/template/${templateId}/archive`)
      return response.data
    },
    onSuccess: (data) => {
      invalidateTemplates()
      if (data.isActive) {
        toast.success("Modelo desarquivado e reativado!")
      } else {
        toast.success("Modelo arquivado com sucesso.")
      }
    },
    onError: () => {
      toast.error("Erro ao alterar status de arquivamento.")
    },
  })

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      await api.delete(`/diet-plans/${templateId}`)
    },
    onSuccess: () => {
      invalidateTemplates()
      toast.success("Modelo excluído com sucesso.")
    },
    onError: () => {
      toast.error("Erro ao excluir modelo.")
    },
  })

  const importTemplateToClient = useMutation({
    mutationFn: async ({ templateId, ...payload }: ScaleAndImportPayload) => {
      const response = await api.post(`/diet-plans/template/${templateId}/import-to-client`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diet"] })
      queryClient.invalidateQueries({ queryKey: ["diet-history"] })
      toast.success("Cardápio importado e aplicado com sucesso ao prontuário do cliente!")
    },
    onError: () => {
      toast.error("Erro ao importar modelo para o cliente.")
    },
  })

  return {
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    toggleArchiveTemplate,
    deleteTemplate,
    importTemplateToClient,
  }
}
