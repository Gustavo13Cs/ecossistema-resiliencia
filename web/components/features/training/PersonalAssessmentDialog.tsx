"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { isAxiosError } from "axios"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useAuth } from "@/contexts/auth-context"
import { useCreateClientAssessment } from "@/hooks/features/useClientAssessments"
import { buildPersonalAssessmentPayload, validatePersonalAssessment, PERSONAL_ASSESSMENT_FIELDS, PERSONAL_ASSESSMENT_GROUPS } from "@/lib/personal-assessment"
import type { PersonalAssessmentValues } from "@/types/assessment"

export interface PersonalAssessmentDialogProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  onSuccess: () => void
  onAccessDenied?: () => void
}
export function PersonalAssessmentDialog(props: PersonalAssessmentDialogProps) {
  const { user } = useAuth()
  if (!props.isOpen || !user?.sub || user.role !== "PERSONAL") return null
  return <AssessmentForm key={`${user.sub}:${props.clientId}`} {...props} />
}

function AssessmentForm({ isOpen, onClose, clientId, onSuccess, onAccessDenied }: PersonalAssessmentDialogProps) {
  const createMutation = useCreateClientAssessment(clientId)
  const [values, setValues] = useState<Partial<PersonalAssessmentValues>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const saving = useRef(false)
  const mounted = useRef(true)
  const returnFocus = useRef<HTMLElement | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const errors = validatePersonalAssessment(values)
  const invalid = Object.keys(errors).length > 0

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (invalid || saving.current || denied) return
    saving.current = true
    setSaveError(null)
    try {
      await createMutation.mutateAsync(buildPersonalAssessmentPayload(values, clientId))
      if (!mounted.current) return
      setValues({})
      onSuccess()
      onClose()
    } catch (error) {
      if (!mounted.current) return
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 401 || status === 403) {
        setValues({})
        setDenied(true)
        onAccessDenied?.()
      } else {
        setSaveError(status === 409
          ? "O prontuário mudou ou foi arquivado. Seus dados continuam preenchidos. Feche a avaliação e recarregue o prontuário para conferir o estado atual."
          : "Não foi possível salvar a avaliação. Seus dados continuam preenchidos; tente novamente.")
      }
    } finally { saving.current = false }
  }

  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto bg-[var(--sm-surface)] sm:max-w-2xl" onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus() }}>
      <DialogTitle className="text-xl font-bold text-[var(--sm-ink)]">Nova avaliação física</DialogTitle>
      <DialogDescription>Preencha apenas as medidas registradas nesta avaliação. Os resultados de 1RM são informados pelo profissional.</DialogDescription>
      {denied ? <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite salvar esta avaliação. Entre novamente ou restabeleça seu acesso para continuar." /> : <form onSubmit={save} noValidate className="space-y-6" aria-busy={createMutation.isPending}>
        {PERSONAL_ASSESSMENT_GROUPS.map(group => <fieldset key={group.title} className="min-w-0 space-y-3">
          <legend className="mb-3 text-base font-bold text-[var(--sm-ink)]">{group.title}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map(field => {
              const definition = PERSONAL_ASSESSMENT_FIELDS[field]
              const id = `personal-assessment-${field}`
              const error = values[field]?.trim() ? errors[field] : undefined
              return <div key={field} className="min-w-0 space-y-2">
                <Label htmlFor={id}>{definition.label} ({definition.unit})</Label>
                <Input id={id} name={field} type="text" inputMode="decimal" value={values[field] ?? ""} disabled={createMutation.isPending} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="min-h-11 text-base tabular-nums md:text-sm" />
                {error ? <p id={`${id}-error`} className="text-sm text-[var(--sm-danger)]">{error}</p> : null}
              </div>
            })}
          </div>
        </fieldset>)}
        <div className="space-y-2">
          <Label htmlFor="personal-assessment-notes">Observações</Label>
          <Textarea id="personal-assessment-notes" value={values.notes ?? ""} disabled={createMutation.isPending} onChange={event => setValues(current => ({ ...current, notes: event.target.value }))} placeholder="Registre observações relevantes para esta avaliação" className="min-h-24 text-base md:text-sm" />
        </div>
        {errors.measurement ? <p className="text-sm text-[var(--sm-muted)]">{errors.measurement}</p> : null}
        {saveError ? <p role="alert" className="text-sm text-[var(--sm-danger)]">{saveError}</p> : null}
        <Button type="submit" disabled={invalid || createMutation.isPending} className="min-h-11 w-full sm:w-auto">{createMutation.isPending ? "Salvando avaliação..." : "Salvar avaliação física"}</Button>
      </form>}
      <DialogClose className="min-h-11 rounded-[var(--sm-radius-sm)] px-4 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]">Fechar avaliação</DialogClose>
    </DialogContent>
  </Dialog>
}
