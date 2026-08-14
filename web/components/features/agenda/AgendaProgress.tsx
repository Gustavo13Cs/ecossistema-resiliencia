import { CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { AgendaDay } from "@/types/agenda"

type AgendaProgressProps = {
  summary: AgendaDay["summary"]
}

export function AgendaProgress({ summary }: AgendaProgressProps) {
  return (
    <Card className="gap-3 border-blue-100 bg-gradient-to-br from-blue-50 to-white py-5">
      <CardContent className="space-y-3 px-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-800">{summary.percentage}% concluído</p>
            <p className="text-sm text-slate-500">
              {summary.completed} de {summary.actionable} tarefas realizadas
            </p>
          </div>
          <CheckCircle2 className="size-8 shrink-0 text-blue-600" aria-hidden="true" />
        </div>
        <Progress
          value={summary.percentage}
          aria-label={`${summary.percentage}% da agenda concluída`}
          className="h-3"
        />
      </CardContent>
    </Card>
  )
}
