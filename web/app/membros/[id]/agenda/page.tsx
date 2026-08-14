"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import { AlertTriangle, ArrowLeft, CalendarDays, Plus } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { AgendaTaskDialog } from "@/components/features/agenda/AgendaTaskDialog"
import { ConsentStatus } from "@/components/features/agenda/ConsentStatus"
import { PatientAgendaSummary } from "@/components/features/agenda/PatientAgendaSummary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useAgenda } from "@/hooks/features/useAgenda"
import { api } from "@/lib/api"
import type { AgendaTask, HealthCheckIn } from "@/types/agenda"

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function localDayUtcRange(selectedDate: string) {
  const [year, month, day] = selectedDate.split("-").map(Number)
  return {
    from: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
    to: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString(),
  }
}

export default function ProfessionalAgendaPage() {
  const params = useParams<{ id: string }>()
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => localDateValue(new Date()))
  const { data, loading, error, refetch } = useAgenda(patientId, selectedDate)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<AgendaTask | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mutatingTaskId, setMutatingTaskId] = useState<string | null>(null)
  const [checkIns, setCheckIns] = useState<HealthCheckIn[]>([])
  const [checkInState, setCheckInState] = useState<"loading" | "denied" | "available" | "error">("loading")
  const checkInRequestId = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++checkInRequestId.current
    setCheckInState("loading")
    setCheckIns([])
    void api.get<HealthCheckIn[]>(`/health-check-ins/patient/${patientId}`, {
      params: localDayUtcRange(selectedDate), signal: controller.signal,
    }).then((response) => {
      if (requestId === checkInRequestId.current) {
        setCheckIns(response.data)
        setCheckInState("available")
      }
    }).catch((requestError) => {
      if (axios.isCancel(requestError) || requestId !== checkInRequestId.current) return
      setCheckInState(axios.isAxiosError(requestError) && requestError.response?.status === 403 ? "denied" : "error")
    })
    return () => {
      checkInRequestId.current += 1
      controller.abort()
    }
  }, [patientId, selectedDate])

  const sortedOccurrences = useMemo(() => data ? {
    ...data,
    occurrences: [...data.occurrences].sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor)),
  } : null, [data])

  const submitTask = async (payload: Parameters<React.ComponentProps<typeof AgendaTaskDialog>["onSubmit"]>[0]) => {
    setSubmitting(true)
    try {
      if (editingTask) await api.patch(`/agenda/tasks/${editingTask.id}`, payload)
      else await api.post("/agenda/tasks", payload)
      toast.success(editingTask ? "Tarefa atualizada com sucesso" : "Tarefa criada com sucesso")
      setDialogOpen(false)
      setEditingTask(null)
      await refetch()
    } catch {
      toast.error("Não foi possível salvar a tarefa.")
    } finally {
      setSubmitting(false)
    }
  }

  const mutateStatus = async (taskId: string, operation: "pause" | "end") => {
    setMutatingTaskId(taskId)
    try {
      await api.post(`/agenda/tasks/${taskId}/${operation}`)
      toast.success(operation === "pause" ? "Tarefa pausada" : "Tarefa encerrada")
      await refetch()
    } catch {
      toast.error("Não foi possível atualizar a tarefa.")
    } finally {
      setMutatingTaskId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-6 md:p-10">
      <header className="space-y-5">
        <Button asChild variant="ghost" className="min-h-11 w-fit">
          <Link href="/membros"><ArrowLeft aria-hidden="true" /> Voltar para membros</Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700"><CalendarDays className="size-6" aria-hidden="true" /></div>
            <div><h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Agenda de {data?.patient.name ?? "paciente"}</h1>
              <p className="mt-1 text-slate-500">Planejamento e acompanhamento diário</p></div>
          </div>
          <Button type="button" className="min-h-11" onClick={() => { setEditingTask(null); setDialogOpen(true) }}>
            <Plus aria-hidden="true" /> Nova tarefa
          </Button>
        </div>
        <div className="w-full rounded-xl border bg-white p-3 sm:w-fit">
          <label htmlFor="professional-agenda-date" className="mb-1 block text-sm font-medium">Data selecionada</label>
          <Input id="professional-agenda-date" type="date" value={selectedDate}
            onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value) }} />
        </div>
      </header>

      {loading ? <div aria-label="Carregando agenda" className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-56" /></div>
        : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="flex items-center gap-2 font-bold"><AlertTriangle className="size-5" aria-hidden="true" /> Não foi possível carregar a agenda</p>
          <p className="mt-1 text-sm">{error}</p><Button variant="outline" className="mt-3" onClick={() => void refetch()}>Tentar novamente</Button>
        </div> : sortedOccurrences ? <PatientAgendaSummary data={sortedOccurrences} professionalId={user?.sub} mutatingTaskId={mutatingTaskId}
          onEdit={(task) => { setEditingTask(task); setDialogOpen(true) }}
          onPause={(taskId) => mutateStatus(taskId, "pause")} onEnd={(taskId) => mutateStatus(taskId, "end")} /> : null}

      <ConsentStatus state={checkInState} records={checkIns} />
      <AgendaTaskDialog open={dialogOpen} patientId={patientId} task={editingTask} submitting={submitting}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTask(null) }} onSubmit={submitTask} />
    </div>
  )
}
