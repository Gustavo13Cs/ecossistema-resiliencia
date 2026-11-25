"use client"

import { useEffect, useId, useState } from "react"
import { isAxiosError } from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useCreatePhysioPackage,
  useUpdatePhysioPackage,
} from "@/hooks/features/usePhysioPackages"
import type {
  PhysioPackageStatus,
  PhysioSessionPackageRecord,
} from "@/types/physio"

interface PhysioPackageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  editingPackage?: PhysioSessionPackageRecord | null
  onAccessDenied?: () => void
}

function toDateInput(value?: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

export function PhysioPackageDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  editingPackage,
  onAccessDenied,
}: PhysioPackageDialogProps) {
  const idPrefix = useId()
  const createPackage = useCreatePhysioPackage()
  const updatePackage = useUpdatePhysioPackage(clientId)

  const [title, setTitle] = useState("Pacote 10 sessões de Fisioterapia")
  const [totalSessions, setTotalSessions] = useState("10")
  const [reassessEvery, setReassessEvery] = useState("5")
  const [startedAt, setStartedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [expiresAt, setExpiresAt] = useState("")
  const [status, setStatus] = useState<PhysioPackageStatus>("ACTIVE")
  const [notes, setNotes] = useState("")
  const [closePrevious, setClosePrevious] = useState(true)

  useEffect(() => {
    if (!open) return
    if (editingPackage) {
      setTitle(editingPackage.title)
      setTotalSessions(String(editingPackage.totalSessions))
      setReassessEvery(
        editingPackage.reassessEverySessions != null
          ? String(editingPackage.reassessEverySessions)
          : "",
      )
      setStartedAt(toDateInput(editingPackage.startedAt))
      setExpiresAt(toDateInput(editingPackage.expiresAt))
      setStatus(editingPackage.status)
      setNotes(editingPackage.notes ?? "")
    } else {
      setTitle("Pacote 10 sessões de Fisioterapia")
      setTotalSessions("10")
      setReassessEvery("5")
      setStartedAt(new Date().toISOString().slice(0, 10))
      setExpiresAt("")
      setStatus("ACTIVE")
      setNotes("")
      setClosePrevious(true)
    }
  }, [open, editingPackage])

  const pending = createPackage.isPending || updatePackage.isPending

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    const totalNum = Number(totalSessions)
    if (!cleanTitle || !Number.isInteger(totalNum) || totalNum < 1) {
      toast.error("Informe um título e um número válido de sessões.")
      return
    }
    const reassessNum = reassessEvery.trim() ? Number(reassessEvery) : null
    if (
      reassessNum !== null &&
      (!Number.isInteger(reassessNum) || reassessNum < 1)
    ) {
      toast.error("O intervalo de reavaliação deve ser maior ou igual a 1.")
      return
    }

    try {
      if (editingPackage) {
        await updatePackage.mutateAsync({
          id: editingPackage.id,
          input: {
            title: cleanTitle,
            totalSessions: totalNum,
            reassessEverySessions: reassessNum,
            expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
            status,
            notes: notes.trim() || null,
          },
        })
        toast.success("Pacote de sessões atualizado.")
      } else {
        await createPackage.mutateAsync({
          clientId,
          title: cleanTitle,
          totalSessions: totalNum,
          reassessEverySessions: reassessNum,
          startedAt: startedAt ? `${startedAt}T00:00:00.000Z` : undefined,
          expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
          notes: notes.trim() || null,
          closePreviousActive: closePrevious,
        })
        toast.success("Pacote de sessões criado.")
      }
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error)) {
        if ([401, 403].includes(error.response?.status ?? 0)) {
          onOpenChange(false)
          onAccessDenied?.()
          return
        }
        if (error.response?.status === 409) {
          toast.error("Prontuário arquivado: alterações de pacote bloqueadas.")
          return
        }
      }
      toast.error("Não foi possível salvar o pacote de sessões.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>
          {editingPackage ? "Editar pacote de sessões" : "Novo pacote de sessões"}
        </DialogTitle>
        <DialogDescription>
          Controle sessões realizadas, faltas e aviso de reavaliação de {clientName}.
        </DialogDescription>

        <form className="space-y-4 pt-1" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-title`}>Título do pacote</Label>
            <Input
              id={`${idPrefix}-title`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Pacote 10 sessões Pós-Op LCA"
              required
              className="min-h-11"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-total`}>Total de sessões</Label>
              <Input
                id={`${idPrefix}-total`}
                type="number"
                min={1}
                max={200}
                value={totalSessions}
                onChange={e => setTotalSessions(e.target.value)}
                required
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-reassess`}>
                Aviso de reavaliação (a cada N sessões)
              </Label>
              <Input
                id={`${idPrefix}-reassess`}
                type="number"
                min={1}
                max={200}
                value={reassessEvery}
                onChange={e => setReassessEvery(e.target.value)}
                placeholder="Ex: 5"
                className="min-h-11"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {!editingPackage ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-start`}>Data de início</Label>
                <Input
                  id={`${idPrefix}-start`}
                  type="date"
                  value={startedAt}
                  onChange={e => setStartedAt(e.target.value)}
                  className="min-h-11"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-status`}>Status do pacote</Label>
                <select
                  id={`${idPrefix}-status`}
                  value={status}
                  onChange={e => setStatus(e.target.value as PhysioPackageStatus)}
                  className="min-h-11 w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-exp`}>Validade (opcional)</Label>
              <Input
                id={`${idPrefix}-exp`}
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-notes`}>Observações (opcional)</Label>
            <textarea
              id={`${idPrefix}-notes`}
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Convênio autorizado guia #1234 ou frequência 2x/semana"
              className="w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
            />
          </div>

          {!editingPackage ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={closePrevious}
                onChange={e => setClosePrevious(e.target.checked)}
                className="h-4 w-4 accent-[var(--sm-brand)]"
              />
              <span>Concluir pacote ativo anterior automaticamente</span>
            </label>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="min-h-11">
              {pending
                ? "Salvando..."
                : editingPackage
                  ? "Salvar pacote"
                  : "Criar pacote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
