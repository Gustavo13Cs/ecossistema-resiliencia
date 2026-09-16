import { useState, useEffect, useMemo, useCallback } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useClients } from "@/hooks/features/useClients"
import {
  ConsolidatedLabExam,
  ConsolidatedLabMarker,
  IssuedLabOrder,
  LabExamsKpi,
  MarkerCategory,
  MarkerStatus,
  CLINICAL_MARKERS_DICTIONARY,
  evaluateMarkerValue,
} from "@/types/lab-exam"

const LOCAL_STORAGE_EXAMS_KEY = "safemove_central_lab_exams_v1"
const LOCAL_STORAGE_ORDERS_KEY = "safemove_issued_lab_orders_v1"

interface CreateExamInput {
  clientId: string
  clientName: string
  date: string
  laboratoryName?: string
  notes?: string
  markers: {
    name: string
    value: number
    unit: string
  }[]
  pdfAttachment?: {
    name: string
    sizeBytes: number
    uploadedAt: string
  }
}

interface IssueOrderInput {
  clientId: string
  clientName: string
  templateTitle?: string
  markers: string[]
  clinicalIndication: string
  preparationInstructions: string
}

export const useCentralLabExams = () => {
  const { data: rawClients = [], isLoading: loadingClients } = useClients("ACTIVE")
  const clients = useMemo(() => rawClients.map((c) => ({ id: c.id, name: c.name })), [rawClients])
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<ConsolidatedLabExam[]>([])
  const [orders, setOrders] = useState<IssuedLabOrder[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<MarkerStatus | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<MarkerCategory | "ALL">("ALL")

  // Helper to enrich raw backend marker or custom marker
  const enrichMarker = (raw: { id?: string; name: string; value: number; unit: string }): ConsolidatedLabMarker => {
    const ref = CLINICAL_MARKERS_DICTIONARY[raw.name] || null
    const status = evaluateMarkerValue(raw.name, raw.value)
    return {
      id: raw.id || `marker-${Math.random().toString(36).substring(2, 9)}`,
      name: raw.name,
      value: raw.value,
      unit: raw.unit,
      status,
      reference: ref,
    }
  }

  // Generate realistic seed exams for clients if empty
  const generateSeedExams = useCallback((activeClients: Array<{ id: string; name: string }>): ConsolidatedLabExam[] => {
    if (!activeClients.length) return []

    const seedDates = [
      "2026-08-10",
      "2026-06-15",
      "2026-03-20",
      "2026-01-12",
    ]

    const result: ConsolidatedLabExam[] = []

    activeClients.slice(0, 4).forEach((client, idx) => {
      // 1st exam (recent)
      const markers1: ConsolidatedLabMarker[] = [
        enrichMarker({ name: "Glicemia de Jejum", value: idx === 0 ? 104 : 88, unit: "mg/dL" }),
        enrichMarker({ name: "Hemoglobina Glicada (HbA1c)", value: idx === 0 ? 5.8 : 5.1, unit: "%" }),
        enrichMarker({ name: "Colesterol Total", value: idx === 0 ? 215 : 178, unit: "mg/dL" }),
        enrichMarker({ name: "HDL Colesterol", value: idx === 0 ? 42 : 55, unit: "mg/dL" }),
        enrichMarker({ name: "LDL Colesterol", value: idx === 0 ? 138 : 98, unit: "mg/dL" }),
        enrichMarker({ name: "Triglicerídeos", value: idx === 0 ? 180 : 110, unit: "mg/dL" }),
        enrichMarker({ name: "25-OH Vitamina D", value: idx === 1 ? 22 : 36, unit: "ng/mL" }),
        enrichMarker({ name: "TSH Ultra Sensível", value: 2.1, unit: "µUI/mL" }),
      ]

      result.push({
        id: `seed-exam-${client.id}-1`,
        clientId: client.id,
        clientName: client.name,
        date: seedDates[0],
        laboratoryName: "Laboratório Fleury / Dasa",
        notes: idx === 0 ? "Paciente com leve resistência insulínica e dislipidemia mista inicial." : "Exames dentro dos padrões clínicos.",
        markers: markers1,
        pdfAttachment: {
          name: `Laudo_Bioquimico_${client.name.replace(/\s+/g, "_")}_Ago26.pdf`,
          sizeBytes: 245000,
          uploadedAt: seedDates[0],
        },
        hasAlerts: markers1.some((m) => m.status === "ALERT" || m.status === "BORDERLINE"),
        createdAt: seedDates[0],
      })

      // 2nd exam (previous for longitudinal chart)
      const markers2: ConsolidatedLabMarker[] = [
        enrichMarker({ name: "Glicemia de Jejum", value: idx === 0 ? 112 : 92, unit: "mg/dL" }),
        enrichMarker({ name: "Hemoglobina Glicada (HbA1c)", value: idx === 0 ? 6.1 : 5.3, unit: "%" }),
        enrichMarker({ name: "Colesterol Total", value: idx === 0 ? 230 : 185, unit: "mg/dL" }),
        enrichMarker({ name: "HDL Colesterol", value: idx === 0 ? 38 : 52, unit: "mg/dL" }),
        enrichMarker({ name: "LDL Colesterol", value: idx === 0 ? 152 : 105, unit: "mg/dL" }),
        enrichMarker({ name: "Triglicerídeos", value: idx === 0 ? 210 : 125, unit: "mg/dL" }),
        enrichMarker({ name: "25-OH Vitamina D", value: idx === 1 ? 18 : 31, unit: "ng/mL" }),
        enrichMarker({ name: "TSH Ultra Sensível", value: 2.4, unit: "µUI/mL" }),
      ]

      result.push({
        id: `seed-exam-${client.id}-2`,
        clientId: client.id,
        clientName: client.name,
        date: seedDates[2],
        laboratoryName: "Laboratório Sabin",
        notes: "Exame basal antes do plano alimentar.",
        markers: markers2,
        pdfAttachment: {
          name: `Laudo_Bioquimico_${client.name.replace(/\s+/g, "_")}_Mar26.pdf`,
          sizeBytes: 210000,
          uploadedAt: seedDates[2],
        },
        hasAlerts: markers2.some((m) => m.status === "ALERT" || m.status === "BORDERLINE"),
        createdAt: seedDates[2],
      })
    })

    return result
  }, [])

  // Initial load
  useEffect(() => {
    if (loadingClients) return

    const loadCentralData = async () => {
      setLoading(true)
      try {
        // 1. Fetch live exams from backend for active clients
        const clientExamsPromises = clients.slice(0, 10).map(async (client: { id: string; name: string }) => {
          try {
            const res = await api.get(`/lab-exams/user/${client.id}`)
            if (Array.isArray(res.data) && res.data.length > 0) {
              return res.data.map((exam: any) => {
                const markers = (exam.markers || []).map((m: any) => enrichMarker(m))
                return {
                  id: exam.id,
                  clientId: client.id,
                  clientName: client.name,
                  date: exam.date ? new Date(exam.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                  laboratoryName: "Laboratório Clínico",
                  notes: exam.notes || null,
                  markers,
                  pdfAttachment: null,
                  hasAlerts: markers.some((m: ConsolidatedLabMarker) => m.status === "ALERT" || m.status === "BORDERLINE"),
                  createdAt: exam.createdAt || exam.date,
                } as ConsolidatedLabExam
              })
            }
          } catch {
            return []
          }
          return []
        })

        const fetchedNested = await Promise.all(clientExamsPromises)
        const apiExams = fetchedNested.flat()

        // 2. Load stored local exams (including PDF uploads & local registers)
        let localExams: ConsolidatedLabExam[] = []
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(LOCAL_STORAGE_EXAMS_KEY)
          if (stored) {
            try {
              localExams = JSON.parse(stored)
            } catch {
              localExams = []
            }
          }
        }

        // Combine API exams and local exams (avoid duplicate IDs)
        const existingIds = new Set(apiExams.map((e: ConsolidatedLabExam) => e.id))
        const nonDuplicateLocal = localExams.filter((e: ConsolidatedLabExam) => !existingIds.has(e.id))
        let combined = [...apiExams, ...nonDuplicateLocal]

        // If no exams at all exist yet, seed realistic exams for demonstration
        if (combined.length === 0 && clients.length > 0) {
          const seeds = generateSeedExams(clients)
          combined = seeds
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_EXAMS_KEY, JSON.stringify(seeds))
          }
        }

        // Sort by date descending
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setExams(combined)

        // 3. Load issued orders
        let localOrders: IssuedLabOrder[] = []
        if (typeof window !== "undefined") {
          const storedOrders = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY)
          if (storedOrders) {
            try {
              localOrders = JSON.parse(storedOrders)
            } catch {
              localOrders = []
            }
          } else if (clients.length > 0) {
            // Seed a sample order
            const sampleOrder: IssuedLabOrder = {
              id: "order-sample-1",
              clientId: clients[0].id,
              clientName: clients[0].name,
              issuedAt: "2026-09-02",
              templateTitle: "Perfil Lipídico & Cardiovascular Completo",
              markers: [
                "Colesterol Total",
                "HDL Colesterol",
                "LDL Colesterol",
                "VLDL Colesterol",
                "Triglicerídeos",
                "Apolipoproteína B (ApoB)",
                "Proteína C Reativa Ultrassensível (PCR-us)",
              ],
              clinicalIndication: "Avaliação do risco aterogênico e ajuste de intervenção nutricional hipolipemiante.",
              preparationInstructions: "Jejum de 12 horas. Evitar consumo de álcool 72h antes. Manter hidratação habitual.",
            }
            localOrders = [sampleOrder]
            localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(localOrders))
          }
        }
        setOrders(localOrders)
      } catch (err) {
        console.error("Erro ao carregar exames centrais:", err)
        toast.error("Não foi possível carregar a central de exames.")
      } finally {
        setLoading(false)
      }
    }

    loadCentralData()
  }, [clients, loadingClients, generateSeedExams])

  // Save changes to localStorage helper
  const persistExams = (updated: ConsolidatedLabExam[]) => {
    setExams(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_EXAMS_KEY, JSON.stringify(updated))
    }
  }

  const persistOrders = (updated: IssuedLabOrder[]) => {
    setOrders(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updated))
    }
  }

  // Register a new lab exam report
  const registerExam = async (input: CreateExamInput) => {
    try {
      // Attempt backend persistence if available
      let backendId: string | null = null
      try {
        const payload = {
          patientId: input.clientId,
          date: new Date(input.date).toISOString(),
          notes: input.notes || undefined,
          markers: input.markers.map((m) => ({
            name: m.name,
            value: Number(m.value),
            unit: m.unit,
          })),
        }
        const res = await api.post("/lab-exams", payload)
        if (res.data?.id) {
          backendId = res.data.id
        }
      } catch (e) {
        // In local mode or mock fallback, continue with local creation
        console.warn("Backend /lab-exams direct save fallback to local storage:", e)
      }

      const enrichedMarkers = input.markers.map((m) => enrichMarker(m))
      const hasAlerts = enrichedMarkers.some((m) => m.status === "ALERT" || m.status === "BORDERLINE")

      const newExam: ConsolidatedLabExam = {
        id: backendId || `exam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clientId: input.clientId,
        clientName: input.clientName,
        date: input.date,
        laboratoryName: input.laboratoryName || "Laboratório Clínico",
        notes: input.notes,
        markers: enrichedMarkers,
        pdfAttachment: input.pdfAttachment || null,
        hasAlerts,
        createdAt: new Date().toISOString(),
      }

      const updated = [newExam, ...exams]
      persistExams(updated)
      toast.success("Laudo laboratorial cadastrado com sucesso!")
      return newExam
    } catch (err) {
      console.error(err)
      toast.error("Erro ao registrar exame.")
      throw err
    }
  }

  // Issue standardized lab requisition
  const issueOrder = (input: IssueOrderInput): IssuedLabOrder => {
    const newOrder: IssuedLabOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      clientId: input.clientId,
      clientName: input.clientName,
      issuedAt: new Date().toISOString().split("T")[0],
      templateTitle: input.templateTitle,
      markers: input.markers,
      clinicalIndication: input.clinicalIndication,
      preparationInstructions: input.preparationInstructions,
    }

    const updated = [newOrder, ...orders]
    persistOrders(updated)
    toast.success("Pedido de exames emitido com sucesso!")
    return newOrder
  }

  // Delete an exam
  const deleteExam = (examId: string) => {
    const updated = exams.filter((e) => e.id !== examId)
    persistExams(updated)
    toast.success("Registro de exame excluído.")
  }

  // Delete an order
  const deleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId)
    persistOrders(updated)
    toast.success("Pedido de exames removido.")
  }

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
    loading: loading || loadingClients,
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
