"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ProfessionalRole } from "@/types/auth"
import type { ClientFormValues } from "@/types/client"
import { getClientFieldGroups, type ClientFieldName, type ClientFormPayload } from "./client-field-policy"

type SharedClientFormProps = {
  role: ProfessionalRole
  initialValues?: Partial<ClientFormValues>
  submitLabel: string
  pending: boolean
}

type ClientFormProps = SharedClientFormProps & (
  | {
      mode: "create"
      onSubmit: (values: ClientFormPayload) => Promise<void>
    }
  | {
      mode: "update"
      initialVersion: string
      onSubmit: (values: ClientFormPayload, snapshotVersion: string) => Promise<{ updatedAt: string }>
    }
)

type ClientFormState = Record<ClientFieldName, string>

interface FieldDefinition {
  label: string
  inputType?: "date" | "email" | "number" | "text"
  min?: number
  max?: number
  step?: string
  multiline?: boolean
  wide?: boolean
}

const FIELD_DEFINITIONS: Record<ClientFieldName, FieldDefinition> = {
  name: { label: "Nome completo", wide: true },
  email: { label: "E-mail", inputType: "email" },
  phone: { label: "Telefone" },
  birthDate: { label: "Data de nascimento", inputType: "date" },
  gender: { label: "Gênero" },
  goal: { label: "Objetivo principal", wide: true },
  height: { label: "Altura (cm)", inputType: "number", step: "0.1" },
  initialWeight: { label: "Peso inicial (kg)", inputType: "number", step: "0.1" },
  allergies: { label: "Alergias e restrições", multiline: true },
  pathologies: { label: "Patologias e condições", multiline: true },
  typicalSleep: { label: "Sono e rotina" },
  stressLevel: { label: "Nível de estresse (1 a 5)", inputType: "number", min: 1, max: 5, step: "1" },
  foodRelationship: { label: "Relação com a alimentação", multiline: true },
  psychologyHistory: { label: "Histórico psicológico", multiline: true },
  exerciseType: { label: "Tipo de exercício" },
  exerciseFrequency: { label: "Frequência de exercícios" },
  exerciseDuration: { label: "Duração dos exercícios" },
  hasPersonal: { label: "Acompanhamento com personal" },
  workActivityLevel: { label: "Nível de atividade no trabalho" },
  professionalNotes: { label: "Anotações profissionais", multiline: true },
  privacyNotes: { label: "Notas de privacidade", multiline: true },
}

const NUMBER_FIELDS = new Set<ClientFieldName>(["height", "initialWeight", "stressLevel"])

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

const serializeField = (field: ClientFieldName, value: string) => {
  const normalized = value.trim()
  if (field === "name") return normalized
  if (NUMBER_FIELDS.has(field)) return normalized === "" ? null : Number(normalized)
  return normalized || null
}

export function ClientForm(props: ClientFormProps) {
  const groups = getClientFieldGroups(props.role)
  const visibleFields = groups.flatMap((group) => group.fields)
  const [values, setValues] = useState<ClientFormState>(() => createInitialState(props.initialValues))
  const [snapshotVersion, setSnapshotVersion] = useState<string | null>(() =>
    props.mode === "update" ? props.initialVersion : null,
  )

  const updateField = (field: ClientFieldName, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = Object.fromEntries(
      visibleFields.map((field) => [field, serializeField(field, values[field])]),
    ) as ClientFormPayload

    try {
      if (props.mode === "update") {
        if (!snapshotVersion) throw new Error("Versão atual do prontuário indisponível")
        const updatedClient = await props.onSubmit(payload, snapshotVersion)
        setSnapshotVersion(updatedClient.updatedAt)
      } else {
        await props.onSubmit(payload)
      }
    } catch {
      // The mutation owner renders the actionable error state without losing form input.
    }
  }

  const handleChange = (field: ClientFieldName) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateField(field, event.target.value)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-9" aria-busy={props.pending}>
      {groups.map((group, index) => (
        <section
          key={group.id}
          aria-labelledby={`client-form-${group.id}`}
          className={index === 0 ? "space-y-5" : "space-y-5 border-t border-[var(--sm-border)] pt-8"}
        >
          <div>
            <h2 id={`client-form-${group.id}`} className="text-lg font-bold tracking-[-0.015em] text-[var(--sm-ink)]">
              {group.title}
            </h2>
            <p className="mt-1 max-w-[65ch] text-sm text-[var(--sm-muted)]">{group.description}</p>
          </div>
          <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
            {group.fields.map((field) => {
              const definition = FIELD_DEFINITIONS[field]
              const sharedProps = {
                id: field,
                name: field,
                value: values[field],
                disabled: props.pending,
                onChange: handleChange(field),
              }

              return (
                <div key={field} className={`min-w-0 space-y-2 ${definition.wide ? "md:col-span-2" : ""}`}>
                  <Label htmlFor={field} className="text-[var(--sm-ink)]">{definition.label}</Label>
                  {definition.multiline ? (
                    <Textarea {...sharedProps} className="min-h-24 resize-y bg-[var(--sm-surface)] text-base md:text-sm" />
                  ) : (
                    <Input
                      {...sharedProps}
                      required={field === "name"}
                      type={definition.inputType ?? "text"}
                      min={definition.min}
                      max={definition.max}
                      step={definition.step}
                      className="min-h-11 bg-[var(--sm-surface)] text-base md:text-sm"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <div className="flex border-t border-[var(--sm-border)] pt-6 sm:justify-end">
        <Button type="submit" disabled={props.pending} className="min-h-11 w-full px-5 font-bold sm:w-auto">
          {props.pending ? "Salvando prontuário..." : props.submitLabel}
        </Button>
      </div>
    </form>
  )
}
