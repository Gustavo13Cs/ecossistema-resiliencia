"use client"

import axios from "axios"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClientForm } from "./ClientForm"
import type { ClientFormPayload } from "./client-field-policy"
import type { ProfessionalRole } from "@/types/auth"
import type { Client } from "@/types/client"

interface ClientOverviewSectionProps {
  client: Client
  role: ProfessionalRole
  formRevision: number
  pending: boolean
  updateError: unknown
  reloadingLatest: boolean
  onUpdate: (values: ClientFormPayload, expectedUpdatedAt: string) => Promise<Client>
  onReloadLatest: () => Promise<void>
}

const isConflictError = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 409

export function ClientOverviewSection({
  client,
  role,
  formRevision,
  pending,
  updateError,
  reloadingLatest,
  onUpdate,
  onReloadLatest,
}: ClientOverviewSectionProps) {
  const conflict = isConflictError(updateError)

  return (
    <section aria-labelledby="client-overview-title" className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)] sm:p-7">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sm-brand)]">Dados autorizados</p>
        <h2 id="client-overview-title" className="mt-2 text-2xl font-black tracking-[-0.025em] text-[var(--sm-ink)]">
          Visão geral do prontuário
        </h2>
        <p className="mt-2 max-w-[65ch] text-sm text-[var(--sm-muted)]">
          Somente os campos pertinentes à sua atuação profissional aparecem nesta área privada.
        </p>
      </div>

      {updateError ? (
        <section
          role="alert"
          aria-labelledby="client-update-error-title"
          className="mb-7 rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)] p-4"
        >
          <h3 id="client-update-error-title" className="font-bold text-[var(--sm-danger)]">
            {conflict ? "Este prontuário foi atualizado em outro acesso" : "Não foi possível salvar o prontuário"}
          </h3>
          <p className="mt-1 max-w-[65ch] text-sm text-[var(--sm-danger)]">
            {conflict
              ? "Revise a versão mais recente antes de editar novamente. Ao recarregar, suas alterações atuais serão substituídas."
              : "Seus campos continuam preenchidos. Verifique a conexão e tente salvar novamente."}
          </p>
          {conflict ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void onReloadLatest()}
              className="mt-4 min-h-11 border-[var(--sm-danger-border)] bg-[var(--sm-surface)] font-bold text-[var(--sm-danger)]"
            >
              <RefreshCw aria-hidden="true" className={`size-4 ${reloadingLatest ? "animate-spin" : ""}`} />
              {reloadingLatest ? "Recarregando versão..." : "Recarregar versão mais recente"}
            </Button>
          ) : null}
        </section>
      ) : null}

      <ClientForm
        key={`${client.id}:${formRevision}`}
        mode="update"
        role={role}
        initialValues={client}
        initialVersion={client.updatedAt}
        submitLabel="Salvar alterações no prontuário"
        pending={pending}
        onSubmit={onUpdate}
      />
    </section>
  )
}
