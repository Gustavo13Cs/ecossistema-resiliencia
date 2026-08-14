import { CalendarClock, Edit3, Pause, Square } from "lucide-react"
import { AgendaProgress } from "@/components/features/agenda/AgendaProgress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AgendaDay, AgendaTask } from "@/types/agenda"

type PatientAgendaSummaryProps = {
  data: AgendaDay
  professionalId?: string
  mutatingTaskId: string | null
  onEdit: (task: AgendaTask) => void
  onPause: (taskId: string) => Promise<void>
  onEnd: (taskId: string) => Promise<void>
}

const categoryLabels = {
  NUTRITION: "Nutrição", TRAINING: "Treino", REHABILITATION: "Reabilitação",
  SUPPLEMENT: "Suplemento", HYDRATION: "Hidratação", CUSTOM: "Outro",
} as const

export function PatientAgendaSummary({
  data, professionalId, mutatingTaskId, onEdit, onPause, onEnd,
}: PatientAgendaSummaryProps) {
  const tasks = Array.from(
    new Map(data.occurrences.map((occurrence) => [occurrence.task.id, occurrence.task])).values(),
  )

  return (
    <section className="space-y-5" aria-label="Planejamento do paciente">
      <AgendaProgress summary={data.summary} />
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="size-5 text-blue-600" aria-hidden="true" />
            Tarefas planejadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
              Nenhuma tarefa para a data selecionada.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const owned = task.professional.id === professionalId
                return (
                  <article key={task.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{task.title}</h3>
                          <Badge variant="secondary">{categoryLabels[task.category]}</Badge>
                          {task.priority === "HIGH" ? <Badge variant="destructive">Alta</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Por {task.professional.name}</p>
                        {task.instructions ? <p className="mt-3 text-sm text-slate-600">{task.instructions}</p> : null}
                      </div>
                      {owned ? (
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => onEdit(task)}>
                            <Edit3 aria-hidden="true" /> Editar
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={mutatingTaskId === task.id}
                            onClick={() => void onPause(task.id)}><Pause aria-hidden="true" /> Pausar</Button>
                          <Button type="button" variant="outline" size="sm" className="min-h-11 text-red-700" disabled={mutatingTaskId === task.id}
                            onClick={() => void onEnd(task.id)}><Square aria-hidden="true" /> Encerrar</Button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
