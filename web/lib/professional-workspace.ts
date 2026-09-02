import type { ProfessionalRole, UserRole } from "@/types/auth"

export interface WorkspaceNavigationItem {
  id: "home" | "clients" | "assessments" | "nutrition" | "foods" | "workouts" | "rehab"
  label: string
  href: string
}

export interface WorkspaceDefinition {
  role: ProfessionalRole
  areaLabel: string
  clientSingular: string
  clientPlural: string
  navigation: readonly WorkspaceNavigationItem[]
}

const SHARED_NAVIGATION = [
  { id: "home", label: "Início", href: "/home" },
  { id: "clients", label: "Clientes", href: "/clientes" },
  { id: "assessments", label: "Avaliações", href: "/avaliacoes" },
] as const satisfies readonly WorkspaceNavigationItem[]

const WORKSPACES = {
  NUTRITIONIST: {
    role: "NUTRITIONIST",
    areaLabel: "Nutrição",
    clientSingular: "Cliente",
    clientPlural: "Clientes",
    navigation: [
      ...SHARED_NAVIGATION,
      { id: "nutrition", label: "Planos alimentares", href: "/dietas" },
      { id: "foods", label: "Alimentos", href: "/alimentos" },
    ],
  },
  PERSONAL: {
    role: "PERSONAL",
    areaLabel: "Treinamento",
    clientSingular: "Aluno",
    clientPlural: "Alunos",
    navigation: [
      ...SHARED_NAVIGATION,
      { id: "workouts", label: "Planilhas", href: "/treinos" },
    ],
  },
  PHYSIO: {
    role: "PHYSIO",
    areaLabel: "Fisioterapia",
    clientSingular: "Paciente",
    clientPlural: "Pacientes",
    navigation: [
      ...SHARED_NAVIGATION,
      { id: "rehab", label: "Reabilitação", href: "/reabilitacao" },
    ],
  },
} as const satisfies Record<ProfessionalRole, WorkspaceDefinition>

const ROLE_ONLY_PREFIXES: ReadonlyArray<[string, readonly ProfessionalRole[]]> = [
  ["/dietas", ["NUTRITIONIST"]],
  ["/alimentos", ["NUTRITIONIST"]],
  ["/treinos", ["PERSONAL"]],
  ["/reabilitacao", ["PHYSIO"]],
  ["/clientes/:id/nova-dieta", ["NUTRITIONIST"]],
  ["/clientes/:id/calculo-energetico", ["NUTRITIONIST"]],
  ["/clientes/:id/exames", ["NUTRITIONIST"]],
  ["/clientes/:id/nova-suplementacao", ["NUTRITIONIST"]],
  ["/clientes/:id/novo-treino", ["PERSONAL"]],
  ["/clientes/:id/nova-reabilitacao", ["PHYSIO"]],
]

const PROFESSIONAL_PATHS = new Set(["/home", "/clientes", "/avaliacoes"])

const matchesPathPrefix = (pathname: string, pattern: string) => {
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pathExpression = escapedPattern.replace(":id", "[^/]+")

  return new RegExp(`^${pathExpression}(?:/|$)`).test(pathname)
}

export const getWorkspaceDefinition = (role: ProfessionalRole) => WORKSPACES[role]

export const getNavigationForRole = (role: ProfessionalRole) => getWorkspaceDefinition(role).navigation

export const canAccessProfessionalPath = (role: UserRole, pathname: string) => {
  if (role === "ADMIN") {
    return pathname === "/home"
  }

  if (matchesPathPrefix(pathname, "/clientes/:id/visao-360")) {
    return false
  }

  const roleOnlyRoute = ROLE_ONLY_PREFIXES.find(([prefix]) => matchesPathPrefix(pathname, prefix))
  if (roleOnlyRoute) {
    return roleOnlyRoute[1].includes(role)
  }

  return PROFESSIONAL_PATHS.has(pathname) || /^\/clientes\/[^/]+$/.test(pathname)
}
