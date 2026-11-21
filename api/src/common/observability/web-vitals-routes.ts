import { roundMs } from './observability.config';

export const WEB_VITAL_METRICS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export type WebVitalMetricName = (typeof WEB_VITAL_METRICS)[number];

export const WEB_VITAL_DEVICES = ['desktop', 'tablet', 'mobile'] as const;
export type WebVitalDeviceCategory = (typeof WEB_VITAL_DEVICES)[number];

export const WEB_VITAL_RATINGS = ['good', 'needs-improvement', 'poor'] as const;
export type WebVitalRating = (typeof WEB_VITAL_RATINGS)[number];

export const WEB_VITAL_NAVIGATION_TYPES = [
  'navigate',
  'reload',
  'back-forward',
  'back-forward-cache',
  'prerender',
  'restore',
  'unknown',
] as const;
export type WebVitalNavigationType =
  (typeof WEB_VITAL_NAVIGATION_TYPES)[number];

export const STATIC_WEB_VITAL_ROUTES = [
  '/',
  '/agenda',
  '/alimentos',
  '/auth/login',
  '/auth/register',
  '/avaliacoes',
  '/clientes',
  '/clientes/novo',
  '/dietas',
  '/evolucao',
  '/exames',
  '/exercicios',
  '/home',
  '/metas',
  '/modelos-planos',
  '/modelos-treinos',
  '/reabilitacao',
  '/receitas',
  '/relatorios',
  '/retornos',
  '/treinos',
] as const;

const STATIC_WEB_VITAL_ROUTE_SET = new Set<string>(STATIC_WEB_VITAL_ROUTES);

const CLIENT_ID_SUBROUTES = new Set<string>([
  'calculo-energetico',
  'exames',
  'nova-anamnese',
  'nova-dieta',
  'nova-reabilitacao',
  'nova-suplementacao',
  'novo-treino',
  'visao-360',
]);

const WEB_VITAL_THRESHOLDS: Record<
  WebVitalMetricName,
  { good: number; poor: number }
> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Maps any incoming pathname to a strict template allowlist so IDs, query
 * strings, or free-form route segments can never enter RUM logs or metrics.
 */
export function normalizeWebVitalRoute(rawRoute: string): string {
  if (typeof rawRoute !== 'string') return '/other';
  const stripped = rawRoute.split(/[?#]/, 1)[0]?.trim() ?? '';
  if (!stripped) return '/other';

  const collapsed = stripped.replace(/\/+/g, '/');
  const withLeading = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  const normalized =
    withLeading.length > 1 && withLeading.endsWith('/')
      ? withLeading.slice(0, -1)
      : withLeading;

  if (STATIC_WEB_VITAL_ROUTE_SET.has(normalized)) {
    return normalized;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments[0] === 'clientes') {
    if (segments.length === 2 && segments[1] !== 'novo') {
      return '/clientes/:id';
    }
    if (segments.length === 3 && CLIENT_ID_SUBROUTES.has(segments[2])) {
      return `/clientes/:id/${segments[2]}`;
    }
    if (segments.length === 4 && segments[2] === 'rascunhos') {
      return '/clientes/:id/rascunhos/:draftId';
    }
    if (segments.length === 4 && segments[2] === 'treinos') {
      return '/clientes/:id/treinos/:workoutId';
    }
  }

  return '/other';
}

export function classifyWebVitalRating(
  metric: WebVitalMetricName,
  value: number,
): WebVitalRating {
  const { good, poor } = WEB_VITAL_THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function roundWebVitalValue(
  metric: WebVitalMetricName,
  value: number,
): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (metric === 'CLS') {
    return Math.round(value * 10_000) / 10_000;
  }
  return roundMs(value);
}
