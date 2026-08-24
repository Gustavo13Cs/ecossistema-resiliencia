"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ClientFormValues } from "@/types/client"

type ClientFormProps = {
  initialValues?: Partial<ClientFormValues>
  submitLabel: string
  pending: boolean
  onSubmit: (values: ClientFormValues) => Promise<void>
}

type ClientFormState = Record<keyof ClientFormValues, string>

type TextFieldProps = {
  field: keyof ClientFormState
  label: string
  value: string
  onChange: (field: keyof ClientFormState, value: string) => void
  type?: "date" | "email" | "number" | "text"
  min?: number
  max?: number
  step?: string
}

const emptyToNull = (value: string) => value.trim() || null

const emptyNumberToNull = (value: string) => {
  const normalized = value.trim()
  return normalized === "" ? null : Number(normalized)
}

const createInitialState = (initialValues?: Partial<ClientFormValues>): ClientFormState => ({
  name: initialValues?.name ?? "",
  email: initialValues?.email ?? "",
  phone: initialValues?.phone ?? "",
  birthDate: initialValues?.birthDate?.slice(0, 10) ?? "",
  gender: initialValues?.gender ?? "",
  goal: initialValues?.goal ?? "",
  height: initialValues?.height?.toString() ?? "",
  initialWeight: initialValues?.initialWeight?.toString() ?? "",
  allergies: initialValues?.allergies ?? "",
  pathologies: initialValues?.pathologies ?? "",
  typicalSleep: initialValues?.typicalSleep ?? "",
  stressLevel: initialValues?.stressLevel?.toString() ?? "",
  foodRelationship: initialValues?.foodRelationship ?? "",
  psychologyHistory: initialValues?.psychologyHistory ?? "",
  exerciseType: initialValues?.exerciseType ?? "",
  exerciseFrequency: initialValues?.exerciseFrequency ?? "",
  exerciseDuration: initialValues?.exerciseDuration ?? "",
  hasPersonal: initialValues?.hasPersonal ?? "",
  workActivityLevel: initialValues?.workActivityLevel ?? "",
  professionalNotes: initialValues?.professionalNotes ?? "",
  privacyNotes: initialValues?.privacyNotes ?? "",
})

function TextField({
  field,
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        name={field}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
      />
    </div>
  )
}

export function ClientForm({ initialValues, submitLabel, pending, onSubmit }: ClientFormProps) {
  const [values, setValues] = useState<ClientFormState>(() => createInitialState(initialValues))

  const updateField = (field: keyof ClientFormState, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formValues: ClientFormValues = {
      name: values.name.trim(),
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      birthDate: emptyToNull(values.birthDate),
      gender: emptyToNull(values.gender),
      goal: emptyToNull(values.goal),
      height: emptyNumberToNull(values.height),
      initialWeight: emptyNumberToNull(values.initialWeight),
      allergies: emptyToNull(values.allergies),
      pathologies: emptyToNull(values.pathologies),
      typicalSleep: emptyToNull(values.typicalSleep),
      stressLevel: emptyNumberToNull(values.stressLevel),
      foodRelationship: emptyToNull(values.foodRelationship),
      psychologyHistory: emptyToNull(values.psychologyHistory),
      exerciseType: emptyToNull(values.exerciseType),
      exerciseFrequency: emptyToNull(values.exerciseFrequency),
      exerciseDuration: emptyToNull(values.exerciseDuration),
      hasPersonal: emptyToNull(values.hasPersonal),
      workActivityLevel: emptyToNull(values.workActivityLevel),
      professionalNotes: emptyToNull(values.professionalNotes),
      privacyNotes: emptyToNull(values.privacyNotes),
    }

    try {
      await onSubmit(formValues)
    } catch {
      // The owner of the mutation renders an actionable error state.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-busy={pending}>
      <section aria-labelledby="dados-principais" className="space-y-4">
        <h2 id="dados-principais" className="text-lg font-semibold text-slate-800">
          Dados principais
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              name="name"
              required
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>
          <TextField field="email" label="E-mail" type="email" value={values.email} onChange={updateField} />
          <TextField field="phone" label="Telefone" value={values.phone} onChange={updateField} />
          <TextField field="birthDate" label="Data de nascimento" type="date" value={values.birthDate} onChange={updateField} />
          <TextField field="gender" label="Gênero" value={values.gender} onChange={updateField} />
          <TextField field="goal" label="Objetivo" value={values.goal} onChange={updateField} />
        </div>
      </section>

      <section aria-labelledby="saude" className="space-y-4">
        <h2 id="saude" className="text-lg font-semibold text-slate-800">
          Saúde e histórico
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField field="height" label="Altura (cm)" type="number" step="0.1" value={values.height} onChange={updateField} />
          <TextField field="initialWeight" label="Peso inicial (kg)" type="number" step="0.1" value={values.initialWeight} onChange={updateField} />
          <TextField field="allergies" label="Alergias" value={values.allergies} onChange={updateField} />
          <TextField field="pathologies" label="Patologias" value={values.pathologies} onChange={updateField} />
          <TextField field="typicalSleep" label="Sono e rotina" value={values.typicalSleep} onChange={updateField} />
          <TextField field="stressLevel" label="Nível de estresse (1 a 5)" type="number" min={1} max={5} step="1" value={values.stressLevel} onChange={updateField} />
          <TextField field="foodRelationship" label="Relação com a alimentação" value={values.foodRelationship} onChange={updateField} />
          <TextField field="psychologyHistory" label="Histórico psicológico" value={values.psychologyHistory} onChange={updateField} />
        </div>
      </section>

      <section aria-labelledby="atividade-fisica" className="space-y-4">
        <h2 id="atividade-fisica" className="text-lg font-semibold text-slate-800">
          Atividade física
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField field="exerciseType" label="Tipo de exercício" value={values.exerciseType} onChange={updateField} />
          <TextField field="exerciseFrequency" label="Frequência" value={values.exerciseFrequency} onChange={updateField} />
          <TextField field="exerciseDuration" label="Duração" value={values.exerciseDuration} onChange={updateField} />
          <TextField field="hasPersonal" label="Possui personal" value={values.hasPersonal} onChange={updateField} />
          <TextField field="workActivityLevel" label="Nível de atividade no trabalho" value={values.workActivityLevel} onChange={updateField} />
        </div>
      </section>

      <section aria-labelledby="observacoes" className="space-y-4">
        <h2 id="observacoes" className="text-lg font-semibold text-slate-800">
          Observações privadas
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="professionalNotes">Anotações profissionais</Label>
            <Textarea
              id="professionalNotes"
              name="professionalNotes"
              value={values.professionalNotes}
              onChange={(event) => updateField("professionalNotes", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="privacyNotes">Notas de privacidade</Label>
            <Textarea
              id="privacyNotes"
              name="privacyNotes"
              value={values.privacyNotes}
              onChange={(event) => updateField("privacyNotes", event.target.value)}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Salvando cliente..." : submitLabel}
      </Button>
    </form>
  )
}
