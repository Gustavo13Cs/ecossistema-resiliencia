"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { isAxiosError } from "axios"
import { useClients } from "@/hooks/features/useClients"

export function WorkoutClientPicker({ open, onOpenChange, onSelect, onAccessDenied }: {
  open: boolean; onOpenChange: (open: boolean) => void; onSelect: (clientId: string) => void; onAccessDenied?: () => void
}) {
  const clients = useClients("ACTIVE", { enabled: open })
  const [search, setSearch] = useState("")
  const returnFocus = useRef<HTMLElement | null>(null)
  const accessDenied = isAxiosError(clients.error) && [401, 403].includes(clients.error.response?.status ?? 0)
  useEffect(() => {
    if (open && accessDenied) onAccessDenied?.()
  }, [open, accessDenied, onAccessDenied])
  const filtered = (clients.data ?? []).filter(client => client.status === "ACTIVE" && client.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-[var(--sm-surface)]" onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={event => {event.preventDefault(); returnFocus.current?.focus()}}>
        <DialogTitle>Selecionar aluno</DialogTitle>
        <DialogDescription>Escolha um aluno ativo da sua base privada para criar a prescrição.</DialogDescription>
        <label className="text-sm font-semibold text-[var(--sm-ink)]" htmlFor="workout-student-search">Buscar aluno</label>
        <input id="workout-student-search" type="search" value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-3 text-[var(--sm-ink)]" />
        {clients.isPending ? <div role="status" aria-label="Carregando alunos" aria-busy="true" className="space-y-3"><span className="sr-only">Buscando alunos ativos.</span><Skeleton aria-hidden="true" className="h-11 w-full" /><Skeleton aria-hidden="true" className="h-11 w-full" /></div> : clients.error ? <AsyncState kind="error" title="Alunos indisponíveis" description="Verifique seu acesso e tente novamente." action={<button type="button" className="min-h-11 font-bold text-[var(--sm-brand)]" onClick={() => void clients.refetch()}>Tentar novamente</button>} /> : (
          <ul aria-label="Alunos ativos" className="max-h-72 overflow-y-auto divide-y divide-[var(--sm-border)]">
            {filtered.map(client => <li key={client.id}><button type="button" aria-label={`Selecionar ${client.name}`} className="min-h-11 w-full break-words rounded-[var(--sm-radius-sm)] px-3 py-3 text-left font-semibold text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]" onClick={() => {onOpenChange(false); onSelect(client.id)}}>{client.name}</button></li>)}
            {filtered.length === 0 ? <li className="py-4 text-sm text-[var(--sm-muted)]">{clients.data?.length ? "Nenhum aluno encontrado" : "Nenhum aluno ativo"}</li> : null}
          </ul>
        )}
        <DialogClose className="min-h-11 rounded-[var(--sm-radius-sm)] px-4 font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]">Fechar seleção</DialogClose>
      </DialogContent>
    </Dialog>
  )
}
