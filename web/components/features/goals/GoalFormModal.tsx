"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Calculator, AlertCircle, Droplets, Target } from "lucide-react"
import type { Client } from "@/types/client"
import type { ClientGoalCommitment, GoalCategory, ClientWithGoalSummary } from "@/types/goal"

interface GoalFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: Omit<ClientGoalCommitment, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void
  clients: Client[]
  initialData?: ClientWithGoalSummary | null
  preSelectedClientId?: string | null
}

const CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: "WEIGHT_LOSS", label: "Emagrecimento & Definição" },
  { value: "HYPERTROPHY", label: "Hipertrofia Muscular" },
  { value: "RECOMPOSITION", label: "Recomposição Corporal" },
  { value: "HEALTH_MAINTENANCE", label: "Saúde, Hábitos & Longevidade" },
  { value: "PERFORMANCE", label: "Performance Esportiva" },
]

export function GoalFormModal({
  isOpen,
  onClose,
  onSave,
  clients,
  initialData,
  preSelectedClientId,
}: GoalFormModalProps) {
  const [clientId, setClientId] = useState("")
  const [category, setCategory] = useState<GoalCategory>("WEIGHT_LOSS")
  const [startWeightKg, setStartWeightKg] = useState("")
  const [targetWeightKg, setTargetWeightKg] = useState("")
  const [startBodyFatPercent, setStartBodyFatPercent] = useState("")
  const [targetBodyFatPercent, setTargetBodyFatPercent] = useState("")
  const [targetMuscleMassKg, setTargetMuscleMassKg] = useState("")
  const [startDate, setStartDate] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [waterTargetMl, setWaterTargetMl] = useState("2500")
  const [sleepTargetHours, setSleepTargetHours] = useState("8")
  const [mealsAdherencePercent, setMealsAdherencePercent] = useState("90")
  const [dailyStepsTarget, setDailyStepsTarget] = useState("8000")
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [habitsNotes, setHabitsNotes] = useState("")

  // Populate form on open / initialData change
  useEffect(() => {
    if (!isOpen) return

    if (initialData && initialData.goal) {
      const g = initialData.goal
      setClientId(g.clientId)
      setCategory(g.category)
      setStartWeightKg(g.startWeightKg?.toString() ?? "")
      setTargetWeightKg(g.targetWeightKg?.toString() ?? "")
      setStartBodyFatPercent(g.startBodyFatPercent?.toString() ?? "")
      setTargetBodyFatPercent(g.targetBodyFatPercent?.toString() ?? "")
      setTargetMuscleMassKg(g.targetMuscleMassKg?.toString() ?? "")
      setStartDate(g.startDate.split("T")[0])
      setTargetDate(g.targetDate.split("T")[0])
      setWaterTargetMl(g.habits.waterTargetMl?.toString() ?? "2500")
      setSleepTargetHours(g.habits.sleepTargetHours?.toString() ?? "8")
      setMealsAdherencePercent(g.habits.mealsAdherencePercent?.toString() ?? "90")
      setDailyStepsTarget(g.habits.dailyStepsTarget?.toString() ?? "8000")
      setClinicalNotes(g.clinicalNotes ?? "")
      setHabitsNotes(g.habits.habitsNotes ?? "")
    } else {
      // New goal defaults
      const selectedId = preSelectedClientId || (clients[0]?.id ?? "")
      setClientId(selectedId)

      const client = clients.find((c) => c.id === selectedId)
      const baseWeight = client?.initialWeight?.toString() ?? "75"
      setStartWeightKg(baseWeight)
      setTargetWeightKg((parseFloat(baseWeight) - 5).toString())
      setStartBodyFatPercent("24")
      setTargetBodyFatPercent("18")
      setTargetMuscleMassKg("")

      const today = new Date()
      setStartDate(today.toISOString().split("T")[0])

      const defaultDeadline = new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000)
      setTargetDate(defaultDeadline.toISOString().split("T")[0])

      // Auto water 35ml/kg
      const numWeight = parseFloat(baseWeight) || 70
      setWaterTargetMl((Math.round((numWeight * 35) / 100) * 100).toString())

      setSleepTargetHours("8")
      setMealsAdherencePercent("90")
      setDailyStepsTarget("8000")
      setClinicalNotes("")
      setHabitsNotes("")
    }
  }, [isOpen, initialData, preSelectedClientId, clients])

  // Handle client change in dropdown
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId)
    const client = clients.find((c) => c.id === newClientId)
    if (client?.initialWeight && !initialData?.goal) {
      setStartWeightKg(client.initialWeight.toString())
      const targetCalc = category === "WEIGHT_LOSS" ? client.initialWeight - 5 : client.initialWeight + 3
      setTargetWeightKg(targetCalc.toString())
      setWaterTargetMl((Math.round((client.initialWeight * 35) / 100) * 100).toString())
    }
  }

  // Calculate water from weight button
  const handleCalculateWater = () => {
    const weight = parseFloat(startWeightKg) || 70
    const calculated = Math.round((weight * 35) / 100) * 100
    setWaterTargetMl(calculated.toString())
  }

  // Real-time weekly rate analysis
  const rateAnalysis = useMemo(() => {
    const startW = parseFloat(startWeightKg)
    const targetW = parseFloat(targetWeightKg)
    if (isNaN(startW) || isNaN(targetW) || !startDate || !targetDate) return null

    const diffDays = Math.max(1, Math.round((new Date(targetDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
    const weeks = Math.max(0.5, diffDays / 7)
    const diffKg = Math.abs(targetW - startW)
    const weeklyRate = Math.round((diffKg / weeks) * 100) / 100

    let feasibility: "healthy" | "aggressive" | "unrealistic" = "healthy"
    let message = `Ritmo estimado de ${weeklyRate} kg/semana em ${Math.round(weeks)} semanas.`

    if (category === "WEIGHT_LOSS") {
      if (weeklyRate > 1.2) {
        feasibility = "unrealistic"
        message = `Atenção: ritmo de ${weeklyRate} kg/sem é muito agressivo. Recomendamos estender o prazo para preservar massa magra.`
      } else if (weeklyRate > 0.75) {
        feasibility = "aggressive"
        message = `Ritmo de ${weeklyRate} kg/sem exige acompanhamento semanal estrito.`
      } else {
        message = `Ritmo seguro e sustentável de ${weeklyRate} kg/semana.`
      }
    } else if (category === "HYPERTROPHY") {
      if (weeklyRate > 0.5) {
        feasibility = "unrealistic"
        message = `Ganho de ${weeklyRate} kg/sem pode acarretar ganho excessivo de gordura. O ritmo ideal gira em torno de 0.2 a 0.35 kg/sem.`
      }
    }

    return { weeklyRate, weeks: Math.round(weeks), feasibility, message }
  }, [startWeightKg, targetWeightKg, startDate, targetDate, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    onSave({
      id: initialData?.goal?.id,
      clientId,
      category,
      startWeightKg: startWeightKg ? parseFloat(startWeightKg) : null,
      targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : null,
      startBodyFatPercent: startBodyFatPercent ? parseFloat(startBodyFatPercent) : null,
      targetBodyFatPercent: targetBodyFatPercent ? parseFloat(targetBodyFatPercent) : null,
      targetMuscleMassKg: targetMuscleMassKg ? parseFloat(targetMuscleMassKg) : null,
      startDate: new Date(startDate).toISOString(),
      targetDate: new Date(targetDate).toISOString(),
      habits: {
        waterTargetMl: parseInt(waterTargetMl, 10) || 2500,
        sleepTargetHours: parseFloat(sleepTargetHours) || 8,
        mealsAdherencePercent: parseInt(mealsAdherencePercent, 10) || 90,
        dailyStepsTarget: parseInt(dailyStepsTarget, 10) || 8000,
        habitsNotes: habitsNotes.trim() || undefined,
      },
      clinicalNotes: clinicalNotes.trim() || undefined,
      status: initialData?.goal?.status ?? "ON_TRACK",
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[var(--sm-brand)]">
            <Target className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Acompanhamento Clínico</span>
          </div>
          <DialogTitle className="text-xl font-black text-[var(--sm-ink)]">
            {initialData?.goal ? "Editar Metas & Hábitos" : "Pactuar Nova Meta Clínica"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--sm-muted)]">
            Defina marcos de composição corporal com prazos viáveis e compromissos diários de adesão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Cliente & Objetivo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="client-select" className="text-xs font-bold text-[var(--sm-ink)]">
                Cliente *
              </Label>
              <select
                id="client-select"
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={Boolean(initialData?.goal)}
                className="w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 py-2 text-sm text-[var(--sm-ink)] focus:border-[var(--sm-brand)] focus:outline-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.initialWeight ? `(${c.initialWeight} kg)` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-select" className="text-xs font-bold text-[var(--sm-ink)]">
                Foco Clínico Principal *
              </Label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 py-2 text-sm text-[var(--sm-ink)] focus:border-[var(--sm-brand)] focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Composição Corporal */}
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sm-brand)]">
              Marcos de Composição Corporal
            </h4>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="start-weight" className="text-[11px] text-[var(--sm-muted)]">
                  Peso Inicial (kg) *
                </Label>
                <Input
                  id="start-weight"
                  type="number"
                  step="0.1"
                  required
                  value={startWeightKg}
                  onChange={(e) => setStartWeightKg(e.target.value)}
                  className="h-9 bg-[var(--sm-surface)] text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="target-weight" className="text-[11px] font-bold text-[var(--sm-ink)]">
                  Peso Alvo (kg) *
                </Label>
                <Input
                  id="target-weight"
                  type="number"
                  step="0.1"
                  required
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  className="h-9 border-[var(--sm-brand)] bg-[var(--sm-surface)] text-sm font-bold text-[var(--sm-brand)]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="start-bf" className="text-[11px] text-[var(--sm-muted)]">
                  % Gordura Inicial
                </Label>
                <Input
                  id="start-bf"
                  type="number"
                  step="0.1"
                  placeholder="ex: 26.5"
                  value={startBodyFatPercent}
                  onChange={(e) => setStartBodyFatPercent(e.target.value)}
                  className="h-9 bg-[var(--sm-surface)] text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="target-bf" className="text-[11px] text-[var(--sm-muted)]">
                  % Gordura Alvo
                </Label>
                <Input
                  id="target-bf"
                  type="number"
                  step="0.1"
                  placeholder="ex: 18.0"
                  value={targetBodyFatPercent}
                  onChange={(e) => setTargetBodyFatPercent(e.target.value)}
                  className="h-9 bg-[var(--sm-surface)] text-sm"
                />
              </div>
            </div>

            {/* Datas / Prazo */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-[11px] text-[var(--sm-muted)]">
                  Data de Início do Ciclo *
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 bg-[var(--sm-surface)] text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="target-date" className="text-[11px] font-bold text-[var(--sm-ink)]">
                  Prazo Estimado (Data Limite) *
                </Label>
                <Input
                  id="target-date"
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-9 bg-[var(--sm-surface)] text-sm font-semibold"
                />
              </div>
            </div>

            {/* Smart Feasibility Feedback */}
            {rateAnalysis && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                  rateAnalysis.feasibility === "unrealistic"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : rateAnalysis.feasibility === "aggressive"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                <Calculator className="size-4 shrink-0 mt-0.5" />
                <span className="font-medium">{rateAnalysis.message}</span>
              </div>
            )}
          </div>

          {/* Metas de Adesão Diária a Hábitos */}
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 shadow-[var(--sm-shadow-rest)]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sm-brand)]">
                Compromissos Diários de Hábitos
              </h4>
              <button
                type="button"
                onClick={handleCalculateWater}
                className="inline-flex items-center gap-1 text-xs text-[var(--sm-brand)] hover:underline"
              >
                <Droplets className="size-3.5" />
                <span>Calcular água (35 ml/kg)</span>
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="water-target" className="text-[11px] text-[var(--sm-muted)]">
                  Água Diária (mL)
                </Label>
                <Input
                  id="water-target"
                  type="number"
                  step="100"
                  required
                  value={waterTargetMl}
                  onChange={(e) => setWaterTargetMl(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sleep-target" className="text-[11px] text-[var(--sm-muted)]">
                  Sono Alvo (horas)
                </Label>
                <Input
                  id="sleep-target"
                  type="number"
                  step="0.5"
                  required
                  value={sleepTargetHours}
                  onChange={(e) => setSleepTargetHours(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="meals-target" className="text-[11px] text-[var(--sm-muted)]">
                  Adesão Dieta (%)
                </Label>
                <Input
                  id="meals-target"
                  type="number"
                  min="50"
                  max="100"
                  required
                  value={mealsAdherencePercent}
                  onChange={(e) => setMealsAdherencePercent(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="steps-target" className="text-[11px] text-[var(--sm-muted)]">
                  Passos Diários
                </Label>
                <Input
                  id="steps-target"
                  type="number"
                  step="500"
                  required
                  value={dailyStepsTarget}
                  onChange={(e) => setDailyStepsTarget(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <Label htmlFor="habits-notes" className="text-[11px] text-[var(--sm-muted)]">
                Orientações Específicas de Hábitos
              </Label>
              <Input
                id="habits-notes"
                placeholder="Ex: Tomar 500ml de água ao acordar e evitar telas após as 22h."
                value={habitsNotes}
                onChange={(e) => setHabitsNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Observações Clínicas */}
          <div className="space-y-1.5">
            <Label htmlFor="clinical-notes" className="text-xs font-bold text-[var(--sm-ink)]">
              Conduta & Observações Clínicas
            </Label>
            <Textarea
              id="clinical-notes"
              rows={2}
              placeholder="Ex: Foco no primeiro mês em adaptação ao déficit moderado e regularidade nas refeições intermediárias."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[var(--sm-brand)] text-white hover:bg-[var(--sm-brand-hover)]">
              Salvar Meta Clínica
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
