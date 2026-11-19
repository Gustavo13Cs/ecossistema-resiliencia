import { getArrayPage, legacyPage, type PaginationMeta } from "@/lib/pagination"
import { useListPage, useClampPage } from "./useListPage"
import { useState, useMemo } from "react"
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

interface ExamPage {
  items: ServerLabExam[]
  pagination: PaginationMeta
  summary: Omit<LabExamsKpi, "clientsCoveragePercent">
  markerNames: string[]
  legacy?: boolean
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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<MarkerStatus | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<MarkerCategory | "ALL">("ALL")
  const { page: examPage, setPage: setExamPage } = useListPage(JSON.stringify([sessionUserId, searchQuery, selectedClientId, statusFilter, categoryFilter]))
  const { page: orderPage, setPage: setOrderPage } = useListPage(sessionUserId)
  const examsQuery = useQuery({
    queryKey: [...examsKey, "page", searchQuery, selectedClientId, statusFilter, categoryFilter, examPage],
    queryFn: async ({ signal }): Promise<ExamPage> => {
      const response = await api.get<ServerLabExam[] | ExamPage>("/lab-exams", { signal, params: {page: examPage, pageSize: 25, q: searchQuery.trim() || undefined, clientId: selectedClientId === "ALL" ? undefined : selectedClientId, status: statusFilter, category: categoryFilter} })
      if (!Array.isArray(response.data)) return response.data
      // A API anterior ainda entrega arrays; compatibilidade temporária na publicação.
      const all = response.data, consolidated = all.map(consolidateExam)
      const filtered = all.filter((row, index) => {
        const exam = consolidated[index], q = searchQuery.trim().toLowerCase()
        return (selectedClientId === "ALL" || exam.clientId === selectedClientId)
          && (!q || [exam.clientName, exam.notes, ...exam.markers.map(marker => marker.name)].some(value => value?.toLowerCase().includes(q)))
          && (statusFilter === "ALL" || exam.markers.some(marker => marker.status === statusFilter))
          && (categoryFilter === "ALL" || exam.markers.some(marker => marker.reference?.category === categoryFilter))
      })
      return { ...legacyPage(filtered, {page: examPage, pageSize: 25}), legacy: true,
        summary: { totalExams: all.length, clientsWithExamsCount: new Set(all.map(row => row.clientId)).size, alteredMarkersCount: consolidated.reduce((sum,exam) => sum+exam.markers.filter(marker => marker.status !== "OPTIMAL").length,0), ordersIssuedCount: 0 },
        markerNames: Array.from(new Set(all.flatMap(row => row.markers.map(marker => marker.name)))) }
    }, enabled,
  })
  const ordersQuery = useQuery({
    queryKey: [...ordersKey, "page", orderPage],
    queryFn: ({signal}) => getArrayPage<ServerLabOrder>("/lab-orders", {page: orderPage, pageSize: 25}, {}, signal),
    enabled,
  })
  useClampPage(examPage, setExamPage, examsQuery.data?.pagination)
  useClampPage(orderPage, setOrderPage, ordersQuery.data?.pagination)
  const exams = useMemo(() => (examsQuery.data?.items ?? []).map(consolidateExam), [examsQuery.data])
  const orders = useMemo(() => (ordersQuery.data?.items ?? []).map(consolidateOrder), [ordersQuery.data])

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
    onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ordersKey }), cache.invalidateQueries({queryKey: examsKey})]); toast.success("Pedido de exames registrado com sucesso!") },
    onError: () => toast.error("Não foi possível registrar o pedido."),
  })
  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => { requireSession(); await api.delete(`/lab-exams/${id}`) },
    onSuccess: async () => { await refreshExams(); toast.success("Registro de exame excluído.") },
    onError: () => toast.error("Não foi possível excluir o exame."),
  })
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => { requireSession(); await api.delete(`/lab-orders/${id}`) },
    onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ordersKey }), cache.invalidateQueries({queryKey: examsKey})]); toast.success("Pedido de exames removido.") },
    onError: () => toast.error("Não foi possível excluir o pedido."),
  })
  const registerExam = registerMutation.mutateAsync
  const issueOrder = orderMutation.mutateAsync
  const deleteExam = deleteExamMutation.mutateAsync
  const deleteOrder = deleteOrderMutation.mutateAsync

  const kpis: LabExamsKpi = useMemo(() => {
    const summary = examsQuery.data?.summary ?? { totalExams: 0, clientsWithExamsCount: 0, alteredMarkersCount: 0, ordersIssuedCount: 0 }
    return { ...summary,
      ordersIssuedCount: examsQuery.data?.legacy ? ordersQuery.data?.pagination.total ?? 0 : summary.ordersIssuedCount,
      clientsCoveragePercent: Math.min(100, Math.round(summary.clientsWithExamsCount / (clients.length || 1) * 100)) }
  }, [examsQuery.data, ordersQuery.data, clients])
  const allAvailableMarkers = useMemo(() => Array.from(new Set([...Object.keys(CLINICAL_MARKERS_DICTIONARY), ...(examsQuery.data?.markerNames ?? [])])).sort(), [examsQuery.data])

  return {
    loading: loadingClients || examsQuery.isLoading || ordersQuery.isLoading,
    error: clientsError || examsQuery.error || ordersQuery.error,
    deleting: deleteExamMutation.isPending || deleteOrderMutation.isPending,
    clients,
    exams,
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
    examPagination: examsQuery.data?.pagination,
    orderPagination: ordersQuery.data?.pagination,
    setExamPage, setOrderPage,
    fetching: examsQuery.isFetching || ordersQuery.isFetching,
  }
}
