"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { isAxiosError } from "axios"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { useWorkoutTemplateHubMutations } from "@/hooks/features/useWorkoutTemplates"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import type { WorkoutTemplateSummary } from "@/types/workout-template"

export interface ApplyWorkoutTemplateDialogProps {
  open: boolean
  template: WorkoutTemplateSummary | null
  onClose: () => void
  onAccessDenied: () => void
}

export function ApplyWorkoutTemplateDialog(
  props: ApplyWorkoutTemplateDialogProps,
) {
  const { user } = useAuth()
  if (
    !props.open ||
    !props.template ||
    !user?.sub ||
    user.role !== "PERSONAL"
  ) {
    return null
  }
  return (
    <ApplySession
      key={`${user.sub}:${props.template.id}`}
      {...props}
      template={props.template}
    />
  )
}

function ApplySession({
  open,
  template,
  onClose,
  onAccessDenied,
}: Omit<ApplyWorkoutTemplateDialogProps, "template"> & {
  template: WorkoutTemplateSummary
}) {
  const router = useRouter()
  const clientsQuery = useClients("ACTIVE", { enabled: open })
  const { applyToClientMutation } = useWorkoutTemplateHubMutations()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClientId, setSelectedClientId] = useState("")
  const [existingDraft, setExistingDraft] = useState<{
    clientId: string
    draftId: string
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const busy = applyToClientMutation.isPending
  const activeClients = (clientsQuery.data ?? []).filter(
    client => client.professionalId === undefined || client.status === "ACTIVE",
  )
  const filteredClients = searchTerm.trim()
    ? activeClients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      )
    : activeClients

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setErrorMessage(null)
    setExistingDraft(null)

    if (!selectedClientId) {
      setErrorMessage("Selecione um aluno ativo para iniciar o rascunho.")
      return
    }

    try {
      const draft = await applyToClientMutation.mutateAsync({
        templateId: template.id,
        clientId: selectedClientId,
      })
      if (draft.recoveredExisting) {
        setExistingDraft({ clientId: selectedClientId, draftId: draft.id })
        return
      }
      onClose()
      navigateToWorkoutPage(
        router,
        `/clientes/${selectedClientId}/rascunhos/${draft.id}`,
      )
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        onAccessDenied()
        return
      }
      const code = isAxiosError<{ code?: string }>(error)
        ? error.response?.data?.code
        : undefined
      if (code === "TEMPLATE_ARCHIVED") {
        setErrorMessage(
          "Este modelo está arquivado. Restaure-o antes de aplicá-lo em um aluno.",
        )
        return
      }
      setErrorMessage(
        "Não foi possível criar o rascunho a partir deste modelo. Tente novamente.",
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !busy) onClose()
      }}
    >
      <DialogContent
        overlayClassName="print:hidden"
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg print:hidden"
      >
        <DialogHeader>
          <DialogTitle>Aplicar modelo em aluno</DialogTitle>
          <DialogDescription>
            O modelo <strong>{template.title}</strong> criará um rascunho
            editável para o aluno selecionado, sem ativar nem sobrescrever o
            treino vigente automaticamente.
          </DialogDescription>
        </DialogHeader>

        <section role="search" aria-label="Buscar aluno ativo" className="space-y-1.5">
          <Label htmlFor="apply-template-client-search" className="flex items-center gap-1.5">
            <Search className="size-3.5" aria-hidden="true" />
            Filtrar alunos ativos
          </Label>
          <Input
            id="apply-template-client-search"
            type="search"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={searchTerm}
            disabled={busy}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Digite o nome do aluno..."
            className="min-h-11"
          />
        </section>

        <form onSubmit={event => void handleSubmit(event)} className="space-y-4">
          {clientsQuery.isPending ? (
            <p role="status" className="py-4 text-sm text-[var(--sm-muted)]">
              Carregando alunos ativos...
            </p>
          ) : clientsQuery.isError ? (
            <div role="alert" className="space-y-2 text-sm text-[var(--sm-danger)]">
              <p>Não foi possível carregar sua lista de alunos ativos.</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-10 text-xs"
                onClick={() => void clientsQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : filteredClients.length === 0 ? (
            <p className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-4 text-sm text-[var(--sm-muted)]">
              Nenhum aluno ativo encontrado para este filtro.
            </p>
          ) : (
            <fieldset
              disabled={busy}
              className="max-h-60 space-y-2 overflow-y-auto rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3"
            >
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                Selecione o aluno ativo
              </legend>
              {filteredClients.map(client => {
                const checked = selectedClientId === client.id
                return (
                  <label
                    key={client.id}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--sm-radius-sm)] border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? "border-[var(--sm-brand)] bg-[var(--sm-canvas)] font-semibold"
                        : "border-transparent hover:bg-[var(--sm-subtle-hover)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="targetClientId"
                        value={client.id}
                        checked={checked}
                        onChange={() => {
                          setSelectedClientId(client.id)
                          setErrorMessage(null)
                          setExistingDraft(null)
                        }}
                        className="size-4 accent-[var(--sm-brand)]"
                      />
                      <span>{client.name}</span>
                    </span>
                    {client.goal ? (
                      <span className="text-xs text-[var(--sm-muted)]">
                        {client.goal}
                      </span>
                    ) : null}
                  </label>
                )
              })}
            </fieldset>
          )}

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger)] p-3 text-sm text-[var(--sm-danger)]"
            >
              {errorMessage}
            </p>
          ) : null}

          {existingDraft ? (
            <div
              role="status"
              className="space-y-2.5 rounded-[var(--sm-radius-sm)] border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
            >
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Este aluno já possui um rascunho aberto. Ele foi preservado para
                evitar perda de elaboração.
              </p>
              <Button
                type="button"
                className="min-h-10 text-xs"
                onClick={() => {
                  onClose()
                  navigateToWorkoutPage(
                    router,
                    `/clientes/${existingDraft.clientId}/rascunhos/${existingDraft.draftId}`,
                  )
                }}
              >
                Abrir rascunho existente
              </Button>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-11"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || Boolean(existingDraft)}
              className="min-h-11"
            >
              {busy ? "Criando rascunho..." : "Criar rascunho para aluno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
