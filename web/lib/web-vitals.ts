import type {
  WebVitalDeviceCategory,
  WebVitalMetricName,
  WebVitalNavigationType,
  WebVitalRating,
  WebVitalReportItem,
} from "@/types/observability"

export const WEB_VITAL_ENDPOINT = "/api/observability/web-vitals"

export const WEB_VITAL_METRICS: readonly WebVitalMetricName[] = [
  "LCP",
  "INP",
  "CLS",
  "FCP",
  "TTFB",
]

export const WEB_VITAL_DEVICES: readonly WebVitalDeviceCategory[] = [
  "desktop",
  "tablet",
  "mobile",
]

const VALID_NAVIGATION_TYPES = new Set<string>([
  "navigate",
  "reload",
  "back-forward",
  "back-forward-cache",
  "prerender",
  "restore",
])

const STATIC_WEB_VITAL_ROUTES = new Set<string>([
  "/",
  "/agenda",
  "/alimentos",
  "/auth/login",
  "/auth/register",
  "/avaliacoes",
  "/clientes",
  "/clientes/novo",
  "/dietas",
  "/evolucao",
  "/exames",
  "/exercicios",
  "/home",
  "/metas",
  "/modelos-planos",
  "/modelos-treinos",
  "/reabilitacao",
  "/receitas",
  "/relatorios",
  "/retornos",
  "/treinos",
])

const CLIENT_ID_SUBROUTES = new Set<string>([
  "calculo-energetico",
  "exames",
  "nova-anamnese",
  "nova-dieta",
  "nova-reabilitacao",
  "nova-suplementacao",
  "novo-treino",
  "visao-360",
])

export const WEB_VITAL_META: Record<
  WebVitalMetricName,
  {
    label: string
    subtitle: string
    unit: "ms" | "score"
    targetLabel: string
  }
> = {
  LCP: {
    label: "LCP",
    subtitle: "Maior pintura de conteúdo",
    unit: "ms",
    targetLabel: "Bom <= 2.500 ms",
  },
  INP: {
    label: "INP",
    subtitle: "Latência à próxima pintura",
    unit: "ms",
    targetLabel: "Bom <= 200 ms",
  },
  CLS: {
    label: "CLS",
    subtitle: "Estabilidade visual acumulada",
    unit: "score",
    targetLabel: "Bom <= 0,100",
  },
  FCP: {
    label: "FCP",
    subtitle: "Primeira pintura de conteúdo",
    unit: "ms",
    targetLabel: "Bom <= 1.800 ms",
  },
  TTFB: {
    label: "TTFB",
    subtitle: "Tempo até o primeiro byte",
    unit: "ms",
    targetLabel: "Bom <= 800 ms",
  },
}

export const WEB_VITAL_DEVICE_LABELS: Record<WebVitalDeviceCategory, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
}

export const WEB_VITAL_RATING_LABELS: Record<WebVitalRating, string> = {
  good: "Bom",
  "needs-improvement": "Precisa melhorar",
  poor: "Ruim",
}

export function isSupportedWebVitalName(
  name: string,
): name is WebVitalMetricName {
  return (WEB_VITAL_METRICS as readonly string[]).includes(name)
}

export function normalizeWebVitalRoute(pathname?: string | null): string {
  if (typeof pathname !== "string") return "/other"
  const stripped = pathname.split(/[?#]/, 1)[0]?.trim() ?? ""
  if (!stripped) return "/other"

  const collapsed = stripped.replace(/\/+/g, "/")
  const withLeading = collapsed.startsWith("/") ? collapsed : `/${collapsed}`
  const normalized =
    withLeading.length > 1 && withLeading.endsWith("/")
      ? withLeading.slice(0, -1)
      : withLeading

  if (STATIC_WEB_VITAL_ROUTES.has(normalized)) {
    return normalized
  }

  const segments = normalized.split("/").filter(Boolean)
  if (segments[0] === "clientes") {
    if (segments.length === 2 && segments[1] !== "novo") {
      return "/clientes/:id"
    }
    if (segments.length === 3 && CLIENT_ID_SUBROUTES.has(segments[2])) {
      return `/clientes/:id/${segments[2]}`
    }
    if (segments.length === 4 && segments[2] === "rascunhos") {
      return "/clientes/:id/rascunhos/:draftId"
    }
    if (segments.length === 4 && segments[2] === "treinos") {
      return "/clientes/:id/treinos/:workoutId"
    }
  }

  return "/other"
}

export function detectDeviceCategory(
  viewportWidth: number,
): WebVitalDeviceCategory {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return "desktop"
  }
  if (viewportWidth < 768) return "mobile"
  if (viewportWidth < 1024) return "tablet"
  return "desktop"
}

export function normalizeNavigationType(
  raw?: string,
): WebVitalNavigationType {
  if (raw && VALID_NAVIGATION_TYPES.has(raw)) {
    return raw as WebVitalNavigationType
  }
  return "unknown"
}

export function roundWebVitalValue(
  metric: WebVitalMetricName,
  value: number,
): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (metric === "CLS") {
    return Math.round(value * 10_000) / 10_000
  }
  return Math.round(value * 100) / 100
}

export function formatWebVitalValue(
  metric: WebVitalMetricName,
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—"
  }
  if (metric === "CLS") {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })
  }
  return `${Math.round(value).toLocaleString("pt-BR")} ms`
}

let webVitalsEndpointUnavailable = false

export function isWebVitalsEndpointUnavailable(): boolean {
  return webVitalsEndpointUnavailable
}

export function resetWebVitalsEndpointAvailability(): void {
  webVitalsEndpointUnavailable = false
}

export async function sendWebVitalsBatch(
  metrics: readonly WebVitalReportItem[],
  fetchImpl: typeof fetch | undefined = typeof fetch === "function"
    ? fetch
    : undefined,
): Promise<void> {
  if (metrics.length === 0 || !fetchImpl || webVitalsEndpointUnavailable) {
    return
  }

  try {
    const response = await fetchImpl(WEB_VITAL_ENDPOINT, {
      method: "POST",
      keepalive: true,
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metrics }),
    })
    if (response && (response.status === 404 || response.status === 405)) {
      webVitalsEndpointUnavailable = true
    }
  } catch {
    // Coleta RUM silenciosa: falhas de rede nunca devem interromper a jornada clínica.
  }
}
