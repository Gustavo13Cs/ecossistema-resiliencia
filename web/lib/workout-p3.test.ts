import { describe, expect, it } from "vitest"
import { summarizeWeeklyVolume, volumeLandmark } from "./workout-volume"
import { getPlanWeek, projectExercise, suggestPeriodization, validatePeriodization } from "./workout-periodization"
import { summarizeWeeklyVolume as apiVolume } from "../../api/src/modules/workouts/workout-volume"
import { projectExercise as apiProject } from "../../api/src/modules/workouts/workout-periodization"

const exercise = { name: "Supino", sets: "4", reps: "6-8", muscleGroup: "CHEST", effortType: "RIR" as const, effortTarget: "3", secondaryMuscles: [{ muscleGroup: "TRICEPS", weight: 0.5 }] }
const splits = [{ name: "A", weeklyFrequency: 2, exercises: [exercise] }]

describe("volume prescrito", () => {
  it("trata séries ausentes como cobertura parcial sem lançar TypeError", () => {
    const input = [{...splits[0],exercises:[{...exercise,sets:undefined as unknown as string}]}]
    expect(summarizeWeeklyVolume(input).complete).toBe(false)
    expect(apiVolume(input).complete).toBe(false)
  })
  it("conta frequência e sinergia por exercício com paridade no servidor", () => {
    const result = summarizeWeeklyVolume(splits)
    expect(result.rows.find(row => row.muscleGroup === "CHEST")).toMatchObject({ direct: 8, synergistic: 0, total: 8 })
    expect(result.rows.find(row => row.muscleGroup === "TRICEPS")).toMatchObject({ direct: 0, synergistic: 4, total: 4 })
    expect(apiVolume(splits)).toEqual(result)
  })
  it.each([[0,"NONE"],[3.5,"BELOW_MV"],[4,"MV"],[7.5,"MV"],[8,"MEV"],[11.5,"MEV"],[12,"MAV"],[20,"MAV"],[20.5,"ABOVE_MAV"],[22,"MRV"]])("classifica %s sem lacuna", (value, label) => {
    expect(volumeLandmark(Number(value))).toBe(label)
  })
  it("exclui texto complexo e frequência antiga ausente sem inventar números", () => {
    const result = summarizeWeeklyVolume([{ ...splits[0], weeklyFrequency: null }, { ...splits[0], exercises: [{ ...exercise, sets: "3+2" }] }])
    expect(result.complete).toBe(false)
    expect(result.excluded).toHaveLength(2)
    expect(result.rows.every(row => row.total === 0)).toBe(true)
    expect(result.alerts).toEqual([])
  })
  it("alerta assimetria com lado zero e ignora secundários duplicados/principal", () => {
    const result = summarizeWeeklyVolume([{ ...splits[0], exercises: [{ ...exercise, sets: "12", secondaryMuscles: [{ muscleGroup: "CHEST", weight: 1 }, ...exercise.secondaryMuscles, ...exercise.secondaryMuscles] }] }])
    expect(result.rows.find(row => row.muscleGroup === "CHEST")?.total).toBe(24)
    expect(result.rows.find(row => row.muscleGroup === "TRICEPS")?.total).toBe(12)
    expect(result.alerts).toHaveLength(1)
  })
})

describe("mesociclo", () => {
  it.each([4,5,6,7,8,9,10,11,12])("cobre %s semanas com fases editáveis válidas", duration => {
    const config = { ...suggestPeriodization(duration), startsOn: "2026-10-23" }
    expect(validatePeriodization(config, duration, true)).toEqual([])
    expect(config.phases.flatMap(phase => Array.from({ length: phase.endWeek - phase.startWeek + 1 }, (_,i) => phase.startWeek + i))).toEqual(Array.from({length:duration}, (_,i) => i+1))
  })
  it("trabalha por data civil no fuso salvo e distingue início/fim", () => {
    const config = { ...suggestPeriodization(8), startsOn: "2026-10-23" }
    expect(getPlanWeek(config, 8, new Date("2026-10-23T02:59:00Z"))).toMatchObject({ status: "NOT_STARTED", week: 1 })
    expect(getPlanWeek(config, 8, new Date("2026-10-30T03:00:00Z"))).toMatchObject({ status: "ACTIVE", week: 2 })
    expect(getPlanWeek(config, 8, new Date("2027-01-01T12:00:00Z"))).toMatchObject({ status: "COMPLETED", week: 8 })
    const dst = { ...config, startsOn: "2026-03-07", timeZone: "America/New_York" }
    expect(getPlanWeek(dst,8,new Date("2026-03-14T04:00:00Z"))).toMatchObject({week:2})
  })
  it("aplica ciclos completos, reinicia esforço na fase e preserva cargas", () => {
    const config = { ...suggestPeriodization(8), startsOn: "2026-10-23", progression: { intervalWeeks: 2, repsDelta: 1, effortDelta: 1 } }
    expect(projectExercise(exercise,config,1)).toMatchObject({reps:"6-8",effortTarget:"3-4"})
    expect(projectExercise(exercise,config,3)).toMatchObject({reps:"7-9",effortTarget:"2"})
    expect(apiProject(exercise,config,5)).toEqual(projectExercise(exercise,config,5))
  })
  it("deload suspende progressão e arredonda séries sem alterar a base", () => {
    const config = { ...suggestPeriodization(8), progression: {intervalWeeks:2,repsDelta:1,effortDelta:1} }
    expect(projectExercise(exercise,config,8)).toMatchObject({sets:"2",reps:"6-8",effortTarget:"4-5"})
    expect(exercise.sets).toBe("4")
    expect(projectExercise({...exercise,sets:"cluster",reps:"30s"},config,8).warnings).toHaveLength(2)
  })
  it("rejeita datas inexistentes, fuso inválido, lacunas e regras não finitas", () => {
    const config = { ...suggestPeriodization(8), startsOn:"2026-02-30",timeZone:"invalid",progression:{intervalWeeks:0,repsDelta:Infinity,effortDelta:1} }
    expect(validatePeriodization(config,8,true).length).toBeGreaterThan(2)
    expect(validatePeriodization({...suggestPeriodization(8),startsOn:""},8,false)).toEqual([])
    expect(validatePeriodization({...suggestPeriodization(8),phases:[]},8,true).length).toBeGreaterThan(0)
  })
})
