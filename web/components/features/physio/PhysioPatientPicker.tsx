"use client"

import { useEffect, useRef, useState } from "react"
import { isAxiosError } from "axios"
import { AsyncState } from "@/components/feedback/AsyncState"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/features/useClients"

export function PhysioPatientPicker({
  open,
  onOpenChange,
  onSelect,
  onAccessDenied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (clientId: string) => void
  onAccessDenied?: () => void
}) {
  const clients = useClients("ACTIVE", { enabled: open })
  const [search, setSearch] = useState("")
  const returnFocus = useRef<HTMLElement | null>(null)
  const accessDenied =
    isAxiosError(clients.error) &&
    [401, 403].includes(clients.error.response?.status ?? 0)

  useEffect(() => {
    if (open && accessDenied) onAccessDenied?.()
  }, [open, accessDenied, onAccessDenied])

  const filtered = (clients.data ?? []).filter(
    (client) =>
      client.status === "ACTIVE" &&
      client.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.trim().toLocaleLowerCase("pt-BR")),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[var(--sm-surface)]"
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus.current?.focus()
        }}
      >
        <DialogTitle>Selecionar paciente</DialogTitle>
        <DialogDescription>
          Escolha um paciente ativo da sua base privada para prescrever um protocolo de reabilitação.
        </DialogDescription>
        <label
          className="text-sm font-semibold text-[var(--sm-ink)]"
          htmlFor="physio-patient-search"
        >
          Buscar paciente
        </label>
        <input
          id="physio-patient-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-3 text-[var(--sm-ink)]"
        />
        {clients.isPending ? (
          <div
            role="status"
            aria-label="Carregando pacientes"
            aria-busy="true"
            className="space-y-3"
          >
            <span className="sr-only">Buscando pacientes ativos.</span>
            <Skeleton aria-hidden="true" className="h-11 w-full" />
            <Skeleton aria-hidden="true" className="h-11 w-full" />
          </div>
        ) : clients.error ? (
          <AsyncState
            kind="error"
            title="Pacientes indisponíveis"
            description="Verifique seu acesso e tente novamente."
            action={
              <button
                type="button"
                className="min-h-11 font-bold text-[var(--sm-brand)]"
                onClick={() => void clients.refetch()}
              >
                Tentar novamente
              </button>
            }
          />
        ) : (
          <ul
            aria-label="Pacientes ativos"
            className="max-h-72 divide-y divide-[var(--sm-border)] overflow-y-auto"
          >
            {filtered.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  aria-label={`Selecionar ${client.name}`}
                  className="min-h-11 w-full break-words rounded-[var(--sm-radius-sm)] px-3 py-3 text-left font-semibold text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
                  onClick={() => {
                    onOpenChange(false)
                    onSelect(client.id)
                  }}
                >
                  {client.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="py-4 text-sm text-[var(--sm-muted)]">
                {clients.data?.length
                  ? "Nenhum paciente encontrado"
                  : "Nenhum paciente ativo"}
              </li>
            ) : null}
          </ul>
        )}
        <DialogClose className="min-h-11 rounded-[var(--sm-radius-sm)] px-4 font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]">
          Fechar seleção
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
