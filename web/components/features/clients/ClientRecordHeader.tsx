"use client"

import Link from "next/link"
import { ArrowLeft, Archive } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { WorkspaceDefinition } from "@/lib/professional-workspace"
import type { Client } from "@/types/client"

interface ClientRecordHeaderProps {
  client: Client
  workspace: WorkspaceDefinition
  pending: boolean
  onArchive: () => Promise<void>
}

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "data indisponível"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function ClientRecordHeader({ client, workspace, pending, onArchive }: ClientRecordHeaderProps) {
  const singular = workspace.clientSingular.toLocaleLowerCase("pt-BR")

  return (
    <header className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)] sm:p-7">
      <Link
        href="/clientes"
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-muted)] transition hover:bg-[var(--sm-surface-muted)] hover:text-[var(--sm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-brand)]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para {workspace.clientPlural.toLocaleLowerCase("pt-BR")}
      </Link>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--sm-brand)]">Prontuário de {singular}</p>
          <h1 className="mt-1 break-words text-3xl font-black tracking-[-0.035em] text-[var(--sm-ink)] sm:text-4xl">
            {client.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--sm-muted)]">
            <span className="rounded-full bg-[var(--sm-success-subtle)] px-3 py-1 font-bold text-[var(--sm-success)]">
              {client.status === "ACTIVE" ? "Ativo" : "Arquivado"}
            </span>
            <span>Atualizado em {formatUpdatedAt(client.updatedAt)}</span>
          </div>
        </div>

        {client.status === "ACTIVE" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                aria-label={`Arquivar ${singular} ${client.name}`}
                className="min-h-11 w-full border-[var(--sm-danger-border)] font-bold text-[var(--sm-danger)] sm:w-auto"
              >
                <Archive aria-hidden="true" className="size-4" />
                Arquivar prontuário
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Arquivar {singular}?</AlertDialogTitle>
                <AlertDialogDescription>
                  O prontuário será preservado na sua base privada e poderá ser restaurado na listagem de arquivados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11" disabled={pending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="min-h-11" disabled={pending} onClick={() => void onArchive()}>
                  {pending ? "Arquivando..." : "Confirmar arquivamento"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </header>
  )
}
