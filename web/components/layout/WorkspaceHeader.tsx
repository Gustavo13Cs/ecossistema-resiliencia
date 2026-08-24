"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, LockKeyhole, LogOut, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/auth-context"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import type { AuthUser, ProfessionalRole } from "@/types/auth"

interface WorkspaceHeaderProps {
  user: AuthUser
  role: ProfessionalRole
  roleLabel: string
}

export function WorkspaceHeader({ user, role, roleLabel }: WorkspaceHeaderProps) {
  const { logout } = useAuth()
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const workspace = getWorkspaceDefinition(role)

  return (
    <header
      aria-label="Cabeçalho do workspace"
      className="relative border-b border-[var(--sm-border)] bg-[var(--sm-surface)] px-4 py-4 pl-20 sm:px-6 sm:pl-20 lg:px-8 lg:py-5"
    >
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[var(--sm-ink)]">
            Área de {workspace.areaLabel}
          </p>
          <p className="text-sm text-[var(--sm-muted)]">{roleLabel}</p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 text-sm text-[var(--sm-muted)] xl:flex">
            <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.8} />
            <span>Base privada · somente sua conta</span>
          </div>

          <Link
            href="/clientes?focus=search"
            aria-label="Buscar cliente"
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm font-semibold text-[var(--sm-ink)] no-underline shadow-[var(--sm-shadow-rest)] transition-colors hover:border-[var(--sm-brand)] hover:text-[var(--sm-brand)] sm:px-4"
          >
            <Search aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            <span className="hidden sm:inline">Buscar cliente</span>
            <span className="sr-only sm:hidden">Buscar cliente</span>
          </Link>

          <Popover open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu da conta"
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sm-radius-sm)] px-2 text-left text-sm text-[var(--sm-ink)] transition-colors hover:bg-[var(--sm-canvas)] sm:px-3"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-[var(--sm-brand)] text-xs font-bold text-[var(--sm-on-brand)]"
                >
                  {user.name?.trim().charAt(0).toUpperCase() || "P"}
                </span>
                <span className="hidden max-w-32 truncate font-semibold md:inline">
                  {user.name?.trim() || "Profissional"}
                </span>
                <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </button>
            </PopoverTrigger>

            <PopoverContent
              role="region"
              aria-label="Conta"
              align="end"
              sideOffset={8}
              className="w-64 rounded-[var(--sm-radius-md)] border-[var(--sm-border)] bg-[var(--sm-surface)] p-2 text-[var(--sm-ink)] shadow-[var(--sm-shadow-elevated)]"
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-[var(--sm-ink)]">
                  {user.name?.trim() || "Profissional"}
                </p>
                <p className="truncate text-xs text-[var(--sm-muted)]">{roleLabel}</p>
                {user.email && (
                  <p className="mt-1 truncate text-xs text-[var(--sm-muted)]">{user.email}</p>
                )}
              </div>
              <div className="my-1 h-px bg-[var(--sm-border)]" />
              <button
                type="button"
                onClick={() => void logout()}
                className="flex min-h-11 w-full items-center gap-2 rounded-[var(--sm-radius-sm)] px-3 text-sm font-semibold text-[var(--sm-danger)] transition-colors hover:bg-[var(--sm-danger-subtle)]"
              >
                <LogOut aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
                Sair
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-[90rem] items-center gap-2 text-sm text-[var(--sm-muted)] xl:hidden">
        <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.8} />
        <span>Base privada · somente sua conta</span>
      </div>
    </header>
  )
}
