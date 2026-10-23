import { VOLUME_MUSCLES, type VolumeLandmark, type VolumeSplit, type WeeklyVolumeSummary } from "@/types/workout-p3";

export function volumeLandmark(total: number): VolumeLandmark {
  if (total === 0) return "NONE";
  if (total < 4) return "BELOW_MV";
  if (total < 8) return "MV";
  if (total < 12) return "MEV";
  if (total <= 20) return "MAV";
  if (total < 22) return "ABOVE_MAV";
  return "MRV";
}
export function recognizedSets(value: string): number | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^\d{1,3}$/.test(text) && Number(text) >= 1 && Number(text) <= 100 ? Number(text) : null;
}
export function summarizeWeeklyVolume(splits: readonly VolumeSplit[]): WeeklyVolumeSummary {
  const result: WeeklyVolumeSummary = { algorithmVersion: 1, rows: VOLUME_MUSCLES.map(muscleGroup => ({ muscleGroup, direct: 0, synergistic: 0, total: 0, landmark: "NONE" })), excluded: [], complete: true, alerts: [] };
  splits.forEach((split, splitIndex) => split.exercises.forEach((exercise, exerciseIndex) => {
    if (["FULL_BODY", "CARDIO", "MOBILITY"].includes(exercise.muscleGroup ?? "")) return;
    const row = result.rows.find(item => item.muscleGroup === exercise.muscleGroup);
    const sets = recognizedSets(exercise.sets);
    const frequency = split.weeklyFrequency;
    const reason = !Number.isInteger(frequency) || !frequency || frequency < 1 || frequency > 7 ? "Frequência não informada" : sets === null ? "Séries não numéricas ou fora de 1–100" : !row ? "Grupo muscular não informado" : null;
    if (reason || !row || sets === null || !frequency) { result.excluded.push({ splitIndex, exerciseIndex, reason: reason ?? "Dados incompletos" }); return; }
    row.direct += sets * frequency;
    const seen = new Set<string>([row.muscleGroup]);
    for (const secondary of exercise.secondaryMuscles ?? []) {
      const target = result.rows.find(item => item.muscleGroup === secondary.muscleGroup);
      if (!target || seen.has(secondary.muscleGroup) || ![0,0.5,1].includes(secondary.weight)) continue;
      seen.add(secondary.muscleGroup);
      target.synergistic += sets * frequency * secondary.weight;
    }
  }));
  result.complete = result.excluded.length === 0;
  for (const row of result.rows) { row.total = row.direct + row.synergistic; row.landmark = volumeLandmark(row.total); }
  if (result.complete) for (const [first,second,label] of [["CHEST","BACK","Peitoral / costas"],["QUADRICEPS","HAMSTRINGS","Quadríceps / posteriores de coxa"]]) {
    const a = result.rows.find(row => row.muscleGroup === first)?.direct ?? 0;
    const b = result.rows.find(row => row.muscleGroup === second)?.direct ?? 0;
    if (Math.max(a,b) >= 12 && Math.max(a,b) > Math.min(a,b) * 2) result.alerts.push(`${label}: revise o equilíbrio das séries diretas.`);
  }
  return result;
}
