"use client"

import { MUSCLE_GROUP_LABELS } from "@/types/workout"
import type { VolumeLandmark, VolumeSplit, WeeklyVolumeSummary } from "@/types/workout-p3"

const LANDMARKS: Record<VolumeLandmark, { label: string; color: string }> = {
  NONE: { label: "Sem séries contabilizadas", color: "text-[var(--sm-muted)]" },
  BELOW_MV: { label: "Abaixo da referência de manutenção", color: "text-amber-700 dark:text-amber-300" },
  MV: { label: "MV / manutenção", color: "text-amber-700 dark:text-amber-300" },
  MEV: { label: "MEV / moderado", color: "text-blue-700 dark:text-blue-300" },
  MAV: { label: "MAV / referência adaptativa", color: "text-green-700 dark:text-green-300" },
  ABOVE_MAV: { label: "Acima da referência adaptativa", color: "text-amber-700 dark:text-amber-300" },
  MRV: { label: "MRV / atenção à recuperação", color: "text-red-700 dark:text-red-300" },
}

export function WeeklyVolumePanel({ summary, splits, saved = false, projected = false }: { summary: WeeklyVolumeSummary; splits?: readonly VolumeSplit[]; saved?: boolean; projected?: boolean }) {
  const content = <div className="space-y-4 pt-4 text-sm">
    <p>Volume prescrito estimado; não representa séries efetivamente realizadas.{saved ? ` Resumo salvo na finalização (algoritmo v${summary.algorithmVersion}).` : projected ? " Projeção da semana consultada; o resumo base salvo permanece intacto." : " Prévia atualizada neste formulário."}</p>
    <p role="status">{summary.complete ? "Cobertura completa dos exercícios de musculação informados." : "Cobertura parcial: faltam dados para contabilizar todos os exercícios. Alertas comparativos suspensos."} Cardio, mobilidade e corpo inteiro não recebem referências de hipertrofia.</p>
    {summary.excluded.length ? <ul aria-label="Exercícios excluídos do volume" className="list-disc space-y-1 pl-5">
      {summary.excluded.map((item, index) => <li key={index}>{splits?.[item.splitIndex]?.name || `Divisão ${item.splitIndex + 1}`} · {splits?.[item.splitIndex]?.exercises[item.exerciseIndex]?.name || `Exercício ${item.exerciseIndex + 1}`}: {item.reason}</li>)}
    </ul> : null}
    <div className="overflow-x-auto">
      <table className="w-full text-left tabular-nums">
        <caption className="sr-only">Séries estimadas por músculo por semana</caption>
        <thead><tr>{["Músculo", "Direto", "Sinérgico", "Total", "Referência"].map(label => <th key={label} scope="col" className="px-2 py-2">{label}</th>)}</tr></thead>
        <tbody>{summary.rows.map(row => <tr key={row.muscleGroup} className="border-t border-[var(--sm-border)]">
          <th scope="row" className="px-2 py-2 font-semibold">{MUSCLE_GROUP_LABELS[row.muscleGroup]}</th>
          <td className="px-2 py-2">{row.direct}</td><td className="px-2 py-2">{row.synergistic}</td><td className="px-2 py-2 font-semibold">{row.total}</td>
          <td className={`px-2 py-2 ${LANDMARKS[row.landmark].color}`}>{LANDMARKS[row.landmark].label}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {summary.complete && summary.alerts.length ? <ul aria-label="Sugestões de revisão" className="list-disc pl-5">{summary.alerts.map(alert => <li key={alert}>{alert}</li>)}</ul> : null}
    <p className="text-[var(--sm-muted)]">Referências gerais de planejamento: abaixo de 4; MV de 4 a menos de 8; MEV de 8 a menos de 12; MAV de 12 a 20; acima de MAV entre 20 e 22; MRV a partir de 22 séries. Não são limites individuais de segurança ou garantia de resultado. Sinergia = séries × frequência × peso informado (0, 0,5 ou 1).</p>
  </div>
  return <section aria-label={projected ? "Volume semanal projetado" : "Volume semanal estimado"} className="min-w-0 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
    {saved || projected ? <><h2 className="text-lg font-bold">{projected ? "Volume semanal projetado" : "Volume semanal estimado"}</h2>{content}</> : <details open><summary className="min-h-11 cursor-pointer text-lg font-bold">Volume semanal estimado</summary>{content}</details>}
  </section>
}
