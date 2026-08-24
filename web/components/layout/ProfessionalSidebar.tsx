"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Apple,
  ClipboardCheck,
  Dumbbell,
  HeartPulse,
  Home,
  NotebookTabs,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  getNavigationForRole,
  getWorkspaceDefinition,
  type WorkspaceNavigationItem,
} from "@/lib/professional-workspace"
import type { AuthUser, ProfessionalRole } from "@/types/auth"

const NAVIGATION_ICONS: Record<WorkspaceNavigationItem["id"], LucideIcon> = {
  home: Home,
  clients: Users,
  assessments: ClipboardCheck,
  nutrition: NotebookTabs,
  foods: Apple,
  workouts: Dumbbell,
  rehab: HeartPulse,
}

interface ProfessionalSidebarProps {
  user: AuthUser
  role: ProfessionalRole
  roleLabel: string
}

export function ProfessionalSidebar({
  user,
  role,
  roleLabel,
}: ProfessionalSidebarProps) {
  const pathname = usePathname()
  const workspace = getWorkspaceDefinition(role)
  const navigation = getNavigationForRole(role)
  const initial = user.name?.trim().charAt(0).toUpperCase() || "P"

  return (
    <aside
      aria-label={`Área de ${workspace.areaLabel}`}
      className="hidden min-h-screen border-r border-[var(--sm-border)] bg-[var(--sm-surface)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"
    >
      <div className="border-b border-[var(--sm-border)] px-7 pb-6 pt-8">
        <Link
          href="/home"
          className="inline-flex items-center gap-3 text-[var(--sm-ink)] no-underline"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] text-sm font-extrabold text-[var(--sm-on-brand)]"
          >
            S
          </span>
          <span className="text-xl font-extrabold tracking-[-0.025em]">SafeMove</span>
        </Link>
        <p className="mt-5 text-sm font-semibold text-[var(--sm-brand)]">
          Área de {workspace.areaLabel}
        </p>
        <p className="mt-1 text-sm text-[var(--sm-muted)]">{roleLabel}</p>
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-1 overflow-y-auto px-4 py-6"
      >
        {navigation.map((item) => {
          const Icon = NAVIGATION_ICONS[item.id]
          const isActive = item.href === "/home"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[var(--sm-radius-sm)] px-3.5 py-2.5 text-sm font-semibold no-underline transition-colors ${
                isActive
                  ? "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]"
                  : "text-[var(--sm-muted)] hover:bg-[var(--sm-canvas)] hover:text-[var(--sm-ink)]"
              }`}
            >
              <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--sm-border)] px-5 py-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--sm-brand)] text-sm font-bold text-[var(--sm-on-brand)]"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--sm-ink)]">
              {user.name?.trim() || "Profissional"}
            </p>
            <p className="truncate text-xs text-[var(--sm-muted)]">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
