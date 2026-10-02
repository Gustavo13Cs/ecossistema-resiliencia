"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client } from "@/types/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type PlanInfo = { title: string; notes: string }
type SupplementItem = { id: string; name: string; composition: string; dosage: string; instructions: string }
type StoredItem = { id: string; name: string; composition: string | null; dosage: string | null; instructions: string | null }
type SupplementPlan = { id: string; title: string; notes: string | null; items: StoredItem[] }
type SupplementPayload = PlanInfo & { clientId: string; items: Omit<SupplementItem, "id">[] }
const emptyInfo: PlanInfo = { title: "Receituário Nutricional", notes: "" }

export const useSuplementos = (clientId: string) => {
  const router = useRouter()
  const { user } = useAuth()
  const cache = useQueryClient()
  const identity = `${user?.sub ?? "anonymous"}:${clientId}`
  const queryKey = queryKeys.supplements(user?.sub ?? "anonymous", clientId)
  const query = useQuery({
    queryKey,
    enabled: Boolean(user?.sub && clientId),
    queryFn: async () => {
      const [client, plan] = await Promise.all([
        api.get<Client>(`/clients/${clientId}`),
        api.get<SupplementPlan | null>(`/supplements/client/${clientId}/active`),
      ])
      return { client: client.data, plan: plan.data }
    },
  })
  const [draft, setDraft] = useState<{ identity: string; planInfo?: PlanInfo; items?: SupplementItem[] } | null>(null)
  const currentDraft = draft?.identity === identity ? draft : null
  const plan = user?.sub ? query.data?.plan : null
  const planInfo = currentDraft?.planInfo ?? (plan ? { title: plan.title, notes: plan.notes ?? "" } : emptyInfo)
  const items: SupplementItem[] = currentDraft?.items ?? plan?.items.map(item => ({
    id: item.id, name: item.name, composition: item.composition ?? "", dosage: item.dosage ?? "", instructions: item.instructions ?? "",
  })) ?? []
  const mutation = useMutation({ mutationFn: (payload: SupplementPayload) => api.post('/supplements', payload) })
  const setPlanInfo = (value: PlanInfo) => setDraft({ identity, items, planInfo: value })
  const setItems = (value: SupplementItem[]) => setDraft({ identity, planInfo, items: value })
  const addItem = () => setItems([...items, { id: crypto.randomUUID(), name: "", composition: "", dosage: "", instructions: "" }])
  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id))
  const updateItem = (id: string, field: keyof Omit<SupplementItem, "id">, value: string) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))

  const savePlan = async () => {
    if (!user?.sub || !query.data || query.isError) {
      toast.error("Carregue o prontuário antes de salvar o receituário.")
      return
    }
    if (!items.length || items.some(item => !item.name.trim())) {
      toast.error("Adicione e preencha ao menos um suplemento.")
      return
    }
    try {
      await mutation.mutateAsync({ clientId, ...planInfo, items: items.map(item => ({ name: item.name, composition: item.composition, dosage: item.dosage, instructions: item.instructions })) })
      await cache.invalidateQueries({ queryKey })
      toast.success("Receituário salvo com sucesso!")
      router.push(`/clientes/${clientId}`)
    } catch {
      toast.error("Erro ao salvar receituário.")
    }
  }

  const handlePrint = () => {
    if (query.data && !query.isError) window.print()
  }

  return {
    patientName: user?.sub ? query.data?.client.name ?? "Carregando..." : "",
    loading: query.isPending || mutation.isPending,
    error: query.isError ? "Não foi possível carregar o prontuário e a prescrição." : null,
    planInfo, setPlanInfo, items, addItem, removeItem, updateItem, savePlan, handlePrint,
  }
}
