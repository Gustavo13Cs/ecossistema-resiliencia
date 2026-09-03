import Link from "next/link"
import { Archive, ArchiveRestore, ArrowRight } from "lucide-react"
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
import type { Client, ClientStatus } from "@/types/client"

interface ClientListItemProps {
  client: Client
  status: ClientStatus
  workspace: WorkspaceDefinition
  layout: "desktop" | "mobile"
  pending: boolean
  locked: boolean
  onChangeStatus: (client: Client) => Promise<void> | void
}

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "Não informada"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date)
}

function StatusAction({ client, status, workspace, pending, locked, onChangeStatus }: Omit<ClientListItemProps, "layout">) {
  const singular = workspace.clientSingular.toLocaleLowerCase("pt-BR")
  const isArchive = status === "ACTIVE"
  const action = isArchive ? "Arquivar" : "Restaurar"
  const pendingAction = isArchive ? "Arquivando" : "Restaurando"
  const ActionIcon = isArchive ? Archive : ArchiveRestore

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={locked}
          aria-label={`${pending ? pendingAction : action} ${singular} ${client.name}`}
          className="min-h-11 px-3 font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-brand-subtle)] hover:text-[var(--sm-brand-hover)]"
        >
          <ActionIcon aria-hidden="true" className="size-4" strokeWidth={1.8} />
          {pending ? `${pendingAction}...` : action}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-elevated)]">
        <AlertDialogHeader>
          <AlertDialogTitle>{action} {singular}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isArchive
              ? `O prontuário de ${client.name} será preservado e poderá ser restaurado depois.`
              : `O prontuário de ${client.name} voltará para a sua base ativa.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={locked} className="min-h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={locked}
            onClick={() => void onChangeStatus(client)}
            className={`min-h-11 ${isArchive ? "bg-[var(--sm-danger)] text-white hover:bg-[var(--sm-danger)]/90" : ""}`}
          >
            {isArchive ? "Confirmar arquivamento" : "Confirmar restauração"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ClientListItem(props: ClientListItemProps) {
  const { client, workspace } = props
  const detailLabel = `Abrir prontuário de ${client.name}`
  const contact = [client.email, client.phone].filter(Boolean).join(" · ") || "Contato não informado"
  const goal = client.goal || "Objetivo não informado"
  const updatedAt = formatUpdatedAt(client.updatedAt)

  if (props.layout === "desktop") {
    return (
      <tr className="border-b border-[var(--sm-border)] last:border-0 hover:bg-[var(--sm-subtle-hover)]">
        <td className="max-w-64 px-5 py-4">
          <Link href={`/clientes/${client.id}`} aria-label={detailLabel} className="font-bold text-[var(--sm-ink)] no-underline hover:text-[var(--sm-brand)] hover:underline">
            <span className="line-clamp-2 break-words">{client.name}</span>
          </Link>
        </td>
        <td className="max-w-72 px-5 py-4 text-sm text-[var(--sm-muted)]"><span className="line-clamp-2 break-all">{contact}</span></td>
        <td className="max-w-72 px-5 py-4 text-sm text-[var(--sm-muted)]"><span className="line-clamp-2 break-words">{goal}</span></td>
        <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--sm-muted)]">{updatedAt}</td>
        <td className="px-5 py-4 text-right"><StatusAction {...props} /></td>
      </tr>
    )
  }

  return (
    <li className="border-b border-[var(--sm-border)] p-4 last:border-0">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--sm-brand-subtle)] text-sm font-bold text-[var(--sm-brand)]">
          {client.name.trim().charAt(0).toUpperCase() || workspace.clientSingular.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <Link href={`/clientes/${client.id}`} aria-label={detailLabel} className="group inline-flex min-w-0 max-w-full items-center gap-1 font-bold text-[var(--sm-ink)] no-underline hover:text-[var(--sm-brand)] hover:underline">
              <span className="line-clamp-2 break-words">{client.name}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
            </Link>
            <span className="shrink-0 rounded-full bg-[var(--sm-brand-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--sm-brand)]">
              {props.status === "ACTIVE" ? "Ativo" : "Arquivado"}
            </span>
          </div>
          <p className="mt-1 break-all text-sm text-[var(--sm-muted)]">{contact}</p>
          <p className="mt-3 line-clamp-2 break-words text-sm text-[var(--sm-ink)]">{goal}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--sm-muted)]">Atualizado em {updatedAt}</p>
          <div className="mt-3 flex justify-end"><StatusAction {...props} /></div>
        </div>
      </div>
    </li>
  )
}
