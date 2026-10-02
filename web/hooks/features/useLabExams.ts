"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export interface LabMarkerInput { name: string; value: number; unit: string }
export interface LabExamInput { date: string; notes?: string; markers: LabMarkerInput[] }
export interface LabExamRecord extends Omit<LabExamInput, "notes"> {
  id: string
  notes?: string | null
  markers: (LabMarkerInput & { id?: string })[]
}

export const useLabExams = (clientId: string) => {
  const router = useRouter()
  const { user } = useAuth()
  const cache = useQueryClient()
  const queryKey = queryKeys.labExams(user?.sub ?? "anonymous", clientId)
  const query = useQuery({
    queryKey,
    enabled: Boolean(user?.sub && clientId),
    queryFn: async () => (await api.get<LabExamRecord[]>(`/lab-exams/client/${clientId}`)).data,
  })
  const exams = user?.sub ? query.data ?? [] : []
  const uniqueMarkers = Array.from(new Set(exams.flatMap(exam => exam.markers.map(marker => marker.name)))).sort()
  const [selected, setSelectedChartMarker] = useState("")
  const selectedChartMarker = uniqueMarkers.includes(selected) ? selected : uniqueMarkers[0] ?? ""
  const chartData = exams.flatMap(exam => {
    const marker = exam.markers.find(entry => entry.name === selectedChartMarker)
    return marker ? [{ date: new Date(exam.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), fullDate: exam.date, value: marker.value, unit: marker.unit }] : []
  })
  const mutation = useMutation({ mutationFn: (payload: LabExamInput & { clientId: string }) => api.post('/lab-exams', payload) })

  const saveExam = async (payload: LabExamInput) => {
    if (!user?.sub || !clientId) return
    try {
      await mutation.mutateAsync({ date: payload.date, notes: payload.notes, markers: payload.markers.map(marker => ({ name: marker.name, value: marker.value, unit: marker.unit })), clientId })
      await Promise.all([
        cache.invalidateQueries({ queryKey }),
        cache.invalidateQueries({ queryKey: queryKeys.centralLabExams(user.sub) }),
      ])
      toast.success("Exames registrados com sucesso!")
      router.push(`/clientes/${clientId}`)
    } catch {
      toast.error("Erro ao salvar exames.")
    }
  }

  return {
    loading: Boolean(user?.sub && clientId) && query.isPending, saving: mutation.isPending,
    error: query.isError ? "Erro ao carregar histórico de exames." : null,
    exams, uniqueMarkers, selectedChartMarker, setSelectedChartMarker, chartData, saveExam,
  }
}
