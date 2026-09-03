"use client"

import { useSyncExternalStore } from "react"
import type { WorkspaceDefinition } from "@/lib/professional-workspace"
import type { Client, ClientStatus } from "@/types/client"
import { ClientListItem } from "./ClientListItem"

interface ClientListProps {
  clients: readonly Client[]
  status: ClientStatus
  workspace: WorkspaceDefinition
  pendingClientId: string | null
  onChangeStatus: (client: Client) => Promise<void> | void
}

const DESKTOP_QUERY = "(min-width: 768px)"

const subscribeToDesktop = (onStoreChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => undefined
  const mediaQuery = window.matchMedia(DESKTOP_QUERY)
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

const getDesktopSnapshot = () => typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches
const getServerSnapshot = () => false

export function ClientList(props: ClientListProps) {
  const isDesktop = useSyncExternalStore(subscribeToDesktop, getDesktopSnapshot, getServerSnapshot)
  const listLabel = `${props.workspace.clientPlural} ${props.status === "ACTIVE" ? "ativos" : "arquivados"}`

  if (!isDesktop) {
    return (
      <ul aria-label={listLabel} className="divide-y divide-[var(--sm-border)]">
        {props.clients.map((client) => (
          <ClientListItem key={client.id} client={client} status={props.status} workspace={props.workspace} layout="mobile" pending={props.pendingClientId === client.id} locked={props.pendingClientId !== null} onChangeStatus={props.onChangeStatus} />
        ))}
      </ul>
    )
  }

  return (
    <table aria-label={listLabel} className="w-full table-fixed border-collapse text-left">
      <thead className="border-b border-[var(--sm-border)] bg-[var(--sm-canvas)] text-xs font-bold uppercase tracking-[0.04em] text-[var(--sm-muted)]">
        <tr>
          <th scope="col" className="w-[20%] px-5 py-3">Nome</th>
          <th scope="col" className="w-[24%] px-5 py-3">Contato</th>
          <th scope="col" className="w-[24%] px-5 py-3">Objetivo</th>
          <th scope="col" className="w-[17%] px-5 py-3">Atualização</th>
          <th scope="col" className="w-[15%] px-5 py-3 text-right">Ações</th>
        </tr>
      </thead>
      <tbody>
        {props.clients.map((client) => (
          <ClientListItem key={client.id} client={client} status={props.status} workspace={props.workspace} layout="desktop" pending={props.pendingClientId === client.id} locked={props.pendingClientId !== null} onChangeStatus={props.onChangeStatus} />
        ))}
      </tbody>
    </table>
  )
}
