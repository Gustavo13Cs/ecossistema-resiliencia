import type { Periodization, PeriodPhase, PlanWeek, ProjectableExercise } from "./workout-p3.types";
import { recognizedSets } from "./workout-volume";

function range(value: string, integer = false): number[] | null {
  const match = value.trim().match(integer ? /^(\d{1,4})(?:\s*(?:-|a)\s*(\d{1,4}))?$/ : /^(\d{1,2}(?:[.,]\d)?)(?:\s*(?:-|a)\s*(\d{1,2}(?:[.,]\d)?))?$/);
  if (!match) return null;
  const numbers = [match[1], ...(match[2] ? [match[2]] : [])].map(text => Number(text.replace(",",".")));
  return numbers.every(Number.isFinite) && (numbers.length === 1 || numbers[0] <= numbers[1]) ? numbers : null;
}
function civilNumber(value: string): number {
  return Date.parse(`${value}T00:00:00Z`) / 86400000;
}
export function validatePeriodization(input: unknown, duration: number | null | undefined, complete = true): string[] {
  if (input === null || input === undefined) return [];
  if (typeof input !== "object" || Array.isArray(input)) return ["Periodização inválida."];
  const value = input as Periodization;
  const errors: string[] = [];
  if (Object.keys(value).some(key => !["version","startsOn","timeZone","phases","progression"].includes(key)) || value.version !== 1) errors.push("Versão/campos da periodização inválidos.");
  if ((complete || duration != null) && (!Number.isInteger(duration) || !duration || duration < 4 || duration > 12)) errors.push("Periodização exige duração de 4 a 12 semanas.");
  if (typeof value.startsOn !== "string" || ((complete || value.startsOn !== "") && (!/^\d{4}-\d{2}-\d{2}$/.test(value.startsOn) || !Number.isFinite(civilNumber(value.startsOn)) || new Date(civilNumber(value.startsOn)*86400000).toISOString().slice(0,10) !== value.startsOn))) errors.push("Informe uma data de início válida.");
  try { if (typeof value.timeZone !== "string" || value.timeZone.length > 100) throw new Error(); new Intl.DateTimeFormat("en", { timeZone: value.timeZone }); } catch { errors.push("Fuso horário inválido."); }
  if (!Array.isArray(value.phases) || value.phases.length > 12 || (complete && value.phases.length === 0)) errors.push("Configure as fases do mesociclo.");
  else {
    let next = 1;
    for (const phase of value.phases) {
      if (!phase || typeof phase !== "object" || Object.keys(phase).some(key => !["name","type","startWeek","endWeek","effortType","effortTarget"].includes(key)) || typeof phase.name !== "string" || phase.name.length > 100 || (complete && !phase.name.trim()) || !["ADAPTATION","OVERLOAD","PEAK","DELOAD"].includes(phase.type) || !Number.isInteger(phase.startWeek) || !Number.isInteger(phase.endWeek) || phase.startWeek !== next || phase.endWeek < phase.startWeek || phase.endWeek > 12) { errors.push("Fases devem cobrir semanas consecutivas, sem sobreposição."); break; }
      next = phase.endWeek + 1;
      const effort = typeof phase.effortTarget === "string" && phase.effortTarget.length <= 20 ? range(phase.effortTarget) : null;
      if (phase.effortType !== null && !["RIR","RPE"].includes(phase.effortType)) errors.push("Escala de esforço inválida.");
      if ((phase.effortType && (!effort || effort.some(number => number < (phase.effortType === "RPE" ? 1 : 0) || number > 10))) || (!phase.effortType && phase.effortTarget !== "")) errors.push("Meta da fase deve usar RIR 0–10 ou RPE 1–10.");
    }
    if (complete && next !== (duration ?? 0) + 1) errors.push("As fases devem cobrir toda a duração do plano.");
  }
  if (value.progression !== null) {
    const rule = value.progression;
    if (!rule || typeof rule !== "object" || Object.keys(rule).some(key => !["intervalWeeks","repsDelta","effortDelta"].includes(key)) || !Number.isInteger(rule.intervalWeeks) || rule.intervalWeeks < 1 || rule.intervalWeeks > 4 || ![0,1,2].includes(rule.repsDelta) || ![0,1,2].includes(rule.effortDelta) || rule.repsDelta + rule.effortDelta === 0) errors.push("Progressão: intervalo 1–4 e incrementos 0–2, com ao menos um incremento.");
  }
  return [...new Set(errors)];
}
export function suggestPeriodization(duration: number): Periodization {
  const weeks = Math.min(12, Math.max(4, Math.trunc(duration) || 8));
  const adaptationEnd = weeks <= 5 ? 1 : 2;
  const overloadEnd = weeks <= 5 ? weeks - 2 : weeks === 6 ? 4 : weeks - 3;
  const phases: PeriodPhase[] = [
    {name:"Adaptação",type:"ADAPTATION",startWeek:1,endWeek:adaptationEnd,effortType:"RIR",effortTarget:"3-4"},
    {name:"Sobrecarga",type:"OVERLOAD",startWeek:adaptationEnd+1,endWeek:overloadEnd,effortType:"RIR",effortTarget:"2"},
    {name:"Pico",type:"PEAK",startWeek:overloadEnd+1,endWeek:weeks-1,effortType:"RIR",effortTarget:"0-1"},
    {name:"Deload",type:"DELOAD",startWeek:weeks,endWeek:weeks,effortType:"RIR",effortTarget:"4-5"},
  ];
  return {version:1,startsOn:"",timeZone:"America/Sao_Paulo",phases,progression:null};
}
export function getPlanWeek(config: Periodization, duration: number, now = new Date()): PlanWeek {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:config.timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const days = civilNumber(today) - civilNumber(config.startsOn);
  return {today,week:Math.max(1, Math.min(duration, Math.floor(days/7)+1)),status:days < 0 ? "NOT_STARTED" : days >= duration*7 ? "COMPLETED" : "ACTIVE"};
}
export function projectExercise<T extends ProjectableExercise>(exercise: T, config: Periodization, week: number): T & { warnings: string[] } {
  const result = {...exercise,warnings:[] as string[]};
  const phase = config.phases.find(item => week >= item.startWeek && week <= item.endWeek);
  if (!phase) return result;
  const deload = phase.type === "DELOAD";
  const rule = config.progression;
  const reps = range(exercise.reps,true);
  if (deload) {
    const sets = recognizedSets(exercise.sets);
    if (sets === null) result.warnings.push("Séries: ajuste manual no deload.");
    else result.sets = String(Math.max(1,Math.round(sets*0.6)));
  } else if (rule?.repsDelta && reps) result.reps = reps.map(number => number + Math.floor((week-1)/rule.intervalWeeks)*rule.repsDelta).join("-");
  if (!reps) result.warnings.push("Repetições textuais: revisão manual.");
  const effortType = phase.effortType ?? exercise.effortType;
  const effortText = phase.effortType ? phase.effortTarget : exercise.effortTarget;
  const effort = effortText ? range(effortText) : null;
  if (effortType && effort) {
    const cycles = !deload && rule ? Math.floor((week-(phase.effortType ? phase.startWeek : 1))/rule.intervalWeeks) : 0;
    result.effortType = effortType;
    result.effortTarget = effort.map(number => Math.max(effortType === "RPE" ? 1 : 0,Math.min(10,number + cycles*(rule?.effortDelta ?? 0)*(effortType === "RPE" ? 1 : -1)))).join("-");
  } else if (effortText) result.warnings.push("Esforço textual: revisão manual.");
  return result;
}
