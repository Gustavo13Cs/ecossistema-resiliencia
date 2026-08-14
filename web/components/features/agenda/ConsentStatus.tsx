import { AlertTriangle, HeartPulse, LoaderCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HealthCheckIn } from "@/types/agenda"

type ConsentStatusProps = {
  state: "loading" | "denied" | "available" | "error"
  records: HealthCheckIn[]
}

export function ConsentStatus({ state, records }: ConsentStatusProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HeartPulse className="size-5 text-rose-600" aria-hidden="true" />
          Check-ins de saúde
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Carregando registros compartilhados…
          </p>
        ) : state === "denied" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-5" aria-hidden="true" />
              Paciente ainda não compartilhou estes registros
            </p>
            <p className="mt-1 text-sm">O acesso depende do consentimento do paciente.</p>
          </div>
        ) : state === "error" ? (
          <p role="alert" className="text-sm text-red-700">
            Não foi possível carregar os check-ins.
          </p>
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum check-in no período selecionado.</p>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li key={record.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                <p className="font-semibold text-slate-800">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(record.recordedAt))}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                  {record.waterMl !== null ? <span>Água: {record.waterMl} ml</span> : null}
                  {record.painLevel !== null ? <span>Dor: {record.painLevel}/10</span> : null}
                  {record.mood !== null ? <span>Humor: {record.mood}/5</span> : null}
                </div>
                {record.symptoms ? <p className="mt-2 text-slate-600">Sintomas: {record.symptoms}</p> : null}
                {record.notes ? <p className="mt-1 text-slate-600">{record.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
