import { useState, useMemo, useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { toast } from "sonner"
import { useClients } from "@/hooks/features/useClients"
import {
  type ConsolidatedLabExam,
  type IssuedLabOrder,
  type LabExamsKpi,
  type MarkerCategory,
  type MarkerStatus,
  type ServerLabExam,
  type ServerLabOrder,
  type CreateExamInput,
  type IssueOrderInput,
  CLINICAL_MARKERS_DICTIONARY,
  evaluateMarkerValue,
} from "@/types/lab-exam"

function consolidateExam(row: ServerLabExam): ConsolidatedLabExam {
  const markers = row.markers.map(marker => ({
    ...marker,
    reference: CLINICAL_MARKERS_DICTIONARY[marker.name] ?? null,
    status: evaluateMarkerValue(marker.name, marker.value),
  }))
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.name,
    date: row.date.split("T")[0],
    notes: row.notes,
    createdAt: row.createdAt,
    markers,
    hasAlerts: markers.some(marker => marker.status !== "OPTIMAL"),
  }
}
function consolidateOrder(row: ServerLabOrder): IssuedLabOrder {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.name,
    issuedAt: row.issuedAt.split("T")[0],
    templateTitle: row.title ?? undefined,
    markers: row.markers,
    clinicalIndication: row.clinicalIndication ?? "",
    preparationInstructions: row.preparationInstructions ?? "",
  }
}

export const useCentralLabExams = () => {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? ""
  const enabled = Boolean(sessionUserId)
  const cache = useQueryClient()
  const { data: rawClients = [], isLoading: loadingClients, error: clientsError } = useClients("ACTIVE")
  const clients = useMemo(() => rawClients.map(client => ({ id: client.id, name: client.name })), [rawClients])
  const examsKey = queryKeys.centralLabExams(sessionUserId)
  const ordersKey = queryKeys.labOrders(sessionUserId)
  const examsQuery = useQuery({
    queryKey: examsKey,
    queryFn: async () => (await api.get<ServerLabExam[]>("/lab-exams")).data,
    enabled,
  })
  const ordersQuery = useQuery({
    queryKey: ordersKey,
    queryFn: async () => (await api.get<ServerLabOrder[]>("/lab-orders")).data,
    enabled,
  })
  const exams = useMemo(() => (examsQuery.data ?? []).map(consolidateExam), [examsQuery.data])
  const orders = useMemo(() => (ordersQuery.data ?? []).map(consolidateOrder), [ordersQuery.data])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<MarkerStatus | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<MarkerCategory | "ALL">("ALL")

  function requireSession() {
    if (!sessionUserId) throw new Error("Sessão necessária")
  }
  async function refreshExams() {
    await cache.invalidateQueries({ queryKey: examsKey })
    await cache.invalidateQueries({ queryKey: ["lab-exams", sessionUserId] })
  }
  const registerMutation = useMutation({
    mutationFn: async (input: CreateExamInput) => {
      requireSession()
      const response = await api.post<ServerLabExam>("/lab-exams", {
        clientId: input.clientId,
        date: new Date(input.date).toISOString(),
        notes: input.notes,
        markers: input.markers.map(marker => ({ name: marker.name, value: marker.value, unit: marker.unit })),
      })
      return consolidateExam(response.data)
    },
    onSuccess: async () => { await refreshExams(); toast.success("Laudo laboratorial cadastrado com sucesso!") },
    onError: () => toast.error("Não foi possível registrar o exame."),
  })
  const orderMutation = useMutation({
    mutationFn: async (input: IssueOrderInput) => {
      requireSession()
      const response = await api.post<ServerLabOrder>("/lab-orders", {
        clientId: input.clientId,
        title: input.templateTitle,
        markers: input.markers,
        clinicalIndication: input.clinicalIndication,
        preparationInstructions: input.preparationInstructions,
      })
      return consolidateOrder(response.data)
    },
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ordersKey }); toast.success("Pedido de exames registrado com sucesso!") },
    onError: () => toast.error("Não foi possível registrar o pedido."),
  })
  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => { requireSession(); await api.delete(`/lab-exams/${id}`) },
    onSuccess: async () => { await refreshExams(); toast.success("Registro de exame excluído.") },
    onError: () => toast.error("Não foi possível excluir o exame."),
  })
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => { requireSession(); await api.delete(`/lab-orders/${id}`) },
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ordersKey }); toast.success("Pedido de exames removido.") },
    onError: () => toast.error("Não foi possível excluir o pedido."),
  })
  const registerExam = registerMutation.mutateAsync
  const issueOrder = orderMutation.mutateAsync
  const deleteExam = deleteExamMutation.mutateAsync
  const deleteOrder = deleteOrderMutation.mutateAsync

  // Calculate KPIs
  const kpis: LabExamsKpi = useMemo(() => {
    const totalExams = exams.length
    const uniqueClientIdsWithExams = new Set(exams.map((e) => e.clientId))
    const clientsWithExamsCount = uniqueClientIdsWithExams.size
    const activeClientsTotal = clients.length || 1
    const clientsCoveragePercent = Math.round((clientsWithExamsCount / activeClientsTotal) * 100)

    let alteredCount = 0
    exams.forEach((exam) => {
      exam.markers.forEach((m) => {
        if (m.status === "ALERT" || m.status === "BORDERLINE") {
          alteredCount++
        }
      })
    })

    return {
      totalExams,
      clientsWithExamsCount,
      clientsCoveragePercent: Math.min(clientsCoveragePercent, 100),
      alteredMarkersCount: alteredCount,
      ordersIssuedCount: orders.length,
    }
  }, [exams, clients, orders])

  // Extract all distinct marker names
  const allAvailableMarkers = useMemo(() => {
    const names = new Set<string>()
    // Include all from dictionary first
    Object.keys(CLINICAL_MARKERS_DICTIONARY).forEach((k) => names.add(k))
    // Also include any custom ones registered in exams
    exams.forEach((exam) => {
      exam.markers.forEach((m) => names.add(m.name))
    })
    return Array.from(names).sort()
  }, [exams])

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Client filter
      if (selectedClientId !== "ALL" && exam.clientId !== selectedClientId) {
        return false
      }

      // Search query (client name, laboratory, notes, marker name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesClient = exam.clientName.toLowerCase().includes(query)
        const matchesLab = exam.laboratoryName?.toLowerCase().includes(query)
        const matchesNotes = exam.notes?.toLowerCase().includes(query)
        const matchesMarker = exam.markers.some((m) => m.name.toLowerCase().includes(query))
        if (!matchesClient && !matchesLab && !matchesNotes && !matchesMarker) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        const hasMatchingStatus = exam.markers.some((m) => m.status === statusFilter)
        if (!hasMatchingStatus) return false
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        const hasMatchingCategory = exam.markers.some((m) => m.reference?.category === categoryFilter)
        if (!hasMatchingCategory) return false
      }

      return true
    })
  }, [exams, selectedClientId, searchQuery, statusFilter, categoryFilter])

  // Longitudinal data builder for a given marker
  const getMarkerLongitudinalSeries = useCallback(
    (markerName: string, clientId?: string) => {
      if (!markerName) return []

      const relevantExams = exams.filter((exam) => {
        if (clientId && clientId !== "ALL" && exam.clientId !== clientId) {
          return false
        }
        return exam.markers.some((m) => m.name.toLowerCase() === markerName.toLowerCase())
      })

      // Sort chronological asc for chart
      const sorted = [...relevantExams].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      return sorted.map((exam) => {
        const marker = exam.markers.find((m) => m.name.toLowerCase() === markerName.toLowerCase())!
        const ref = marker.reference || CLINICAL_MARKERS_DICTIONARY[marker.name]

        return {
          date: exam.date,
          displayDate: new Date(`${exam.date}T12:00:00`).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          }),
          clientName: exam.clientName,
          value: marker.value,
          unit: marker.unit,
          status: marker.status,
          minRef: ref?.min,
          maxRef: ref?.max,
          optimalMin: ref?.optimalMin,
          optimalMax: ref?.optimalMax,
        }
      })
    },
    [exams]
  )

  return {
    loading: loadingClients || examsQuery.isLoading || ordersQuery.isLoading,
    error: clientsError || examsQuery.error || ordersQuery.error,
    deleting: deleteExamMutation.isPending || deleteOrderMutation.isPending,
    clients,
    exams: filteredExams,
    rawExams: exams,
    orders,
    kpis,
    allAvailableMarkers,
    // Filters
    searchQuery,
    setSearchQuery,
    selectedClientId,
    setSelectedClientId,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    // Methods
    registerExam,
    issueOrder,
    deleteExam,
    deleteOrder,
    getMarkerLongitudinalSeries,
  }
}
