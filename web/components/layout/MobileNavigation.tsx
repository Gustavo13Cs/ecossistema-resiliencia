"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockKeyhole, LogOut, Menu, X } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { getNavigationForRole, getWorkspaceDefinition } from "@/lib/professional-workspace"
import type { AuthUser, ProfessionalRole } from "@/types/auth"

interface MobileNavigationProps {
  user: AuthUser
  role: ProfessionalRole
  roleLabel: string
}

export function MobileNavigation({ user, role, roleLabel }: MobileNavigationProps) {
  const { logout } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const workspace = getWorkspaceDefinition(role)
  const navigation = getNavigationForRole(role)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="fixed left-4 top-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm font-semibold text-[var(--sm-ink)] shadow-[var(--sm-shadow-rest)] lg:hidden"
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.8} />
          <span className="sr-only sm:not-sr-only">Menu</span>
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="left-0 top-0 h-dvh w-[min(88vw,22rem)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 border-r border-[var(--sm-border)] bg-[var(--sm-surface)] p-0 shadow-[var(--sm-shadow-drawer)] lg:hidden"
      >
        <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
        <DialogDescription className="sr-only">
          Navegação privada da área de {workspace.areaLabel}
        </DialogDescription>

        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-[var(--sm-border)] px-5 py-5">
            <div>
              <p className="text-lg font-extrabold tracking-[-0.025em] text-[var(--sm-ink)]">
                SafeMove
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--sm-brand)]">
                Área de {workspace.areaLabel}
              </p>
              <p className="mt-1 text-sm text-[var(--sm-muted)]">{roleLabel}</p>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Fechar menu"
                className="grid size-11 place-items-center rounded-[var(--sm-radius-sm)] text-[var(--sm-muted)] hover:bg-[var(--sm-canvas)] hover:text-[var(--sm-ink)]"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </button>
            </DialogClose>
          </div>

          <nav aria-label="Navegação móvel" className="flex-1 space-y-0.5 overflow-y-auto p-4">
            {navigation.map((item, index) => {
              const isActive = item.href === "/home"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

              const showSectionHeader = Boolean(
                item.section && (index === 0 || navigation[index - 1].section !== item.section)
              )

              return (
                <div key={item.id}>
                  {showSectionHeader && (
                    <p className="mb-1 mt-4 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--sm-muted)]">
                      {item.section}
                    </p>
                  )}
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`flex min-h-11 items-center rounded-[var(--sm-radius-sm)] px-4 text-sm font-semibold no-underline ${
                      isActive
                        ? "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]"
                        : "text-[var(--sm-muted)] hover:bg-[var(--sm-canvas)] hover:text-[var(--sm-ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </div>
              )
            })}
          </nav>

          <section aria-label="Conta" className="border-t border-[var(--sm-border)] p-5">
            <div className="mb-4 flex items-start gap-2 text-xs text-[var(--sm-muted)]">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
              <span>Base privada · somente sua conta</span>
            </div>
            <p className="truncate text-sm font-semibold text-[var(--sm-ink)]">
              {user.name?.trim() || "Profissional"}
            </p>
            <p className="mt-1 text-xs text-[var(--sm-muted)]">{roleLabel}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] text-sm font-semibold text-[var(--sm-danger)] hover:bg-[var(--sm-danger-subtle)]"
            >
              <LogOut aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
              Sair
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
