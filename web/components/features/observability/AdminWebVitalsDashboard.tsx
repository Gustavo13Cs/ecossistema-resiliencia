"use client"

import { useState } from "react"
import { Activity, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useWebVitalsDashboard } from "@/hooks/features/useWebVitalsDashboard"
import {
  formatWebVitalValue,
  WEB_VITAL_DEVICE_LABELS,
  WEB_VITAL_DEVICES,
  WEB_VITAL_META,
  WEB_VITAL_METRICS,
  WEB_VITAL_RATING_LABELS,
} from "@/lib/web-vitals"
import type {
  WebVitalDeviceCategory,
  WebVitalMetricStats,
  WebVitalRating,
} from "@/types/observability"

function RatingBadge({ rating }: { rating?: WebVitalRating }) {
  if (!rating) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-muted)]">
        Sem dados
      </span>
    )
  }

  const badgeClass =
    rating === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : rating === "needs-improvement"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)] text-[var(--sm-danger)]"

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
    >
      {WEB_VITAL_RATING_LABELS[rating]}
    </span>
  )
}

function DeviceIcon({ device }: { device: WebVitalDeviceCategory }) {
  if (device === "mobile") {
    return <Smartphone className="h-4 w-4 text-[var(--sm-muted)]" aria-hidden="true" />
  }
  if (device === "tablet") {
    return <Tablet className="h-4 w-4 text-[var(--sm-muted)]" aria-hidden="true" />
  }
  return <Monitor className="h-4 w-4 text-[var(--sm-muted)]" aria-hidden="true" />
}

function SummaryMetricCell({
  metric,
  stats,
}: {
  metric: (typeof WEB_VITAL_METRICS)[number]
  stats: WebVitalMetricStats | null
}) {
  return (
    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--sm-ink)]">
      {stats ? formatWebVitalValue(metric, stats.p75) : "—"}
    </td>
  )
}

export function AdminWebVitalsDashboard() {
  const [selectedDevice, setSelectedDevice] =
    useState<WebVitalDeviceCategory | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  const { data, isLoading, isFetching, isError, refetch } =
    useWebVitalsDashboard({
      route: selectedRoute,
      device: selectedDevice,
      top: 25,
    })

  const availableRoutes = data?.availableRoutes ?? []
  const routeValue =
    selectedRoute && availableRoutes.includes(selectedRoute)
      ? selectedRoute
      : ""

  return (
    <section
      aria-labelledby="rum-web-vitals-heading"
      className="mt-6 space-y-6 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6 shadow-[var(--sm-shadow-rest)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--sm-brand)]">
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span>Monitoramento RUM</span>
          </div>
          <h2
            id="rum-web-vitals-heading"
            className="mt-1 text-xl font-bold tracking-[-0.02em] text-[var(--sm-ink)]"
          >
            Web Vitals em produção (RUM)
          </h2>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Métricas reais de navegador (p75 por padrão) segmentadas por rota
            normalizada e dispositivo, sem dados clínicos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3.5 py-2 text-sm font-semibold text-[var(--sm-ink)] transition-colors hover:bg-[var(--sm-subtle-hover)] disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>Atualizar</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 border-y border-[var(--sm-border)] py-4 md:flex-row md:items-center md:justify-between">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar por dispositivo"
        >
          <button
            type="button"
            aria-pressed={selectedDevice === null}
            onClick={() => setSelectedDevice(null)}
            className={`rounded-[var(--sm-radius-sm)] border px-3 py-1.5 text-sm font-semibold transition-colors ${
              selectedDevice === null
                ? "border-[var(--sm-brand)] bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                : "border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
            }`}
          >
            Todos
          </button>
          {WEB_VITAL_DEVICES.map((device) => {
            const active = selectedDevice === device
            return (
              <button
                key={device}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedDevice(device)}
                className={`inline-flex items-center gap-1.5 rounded-[var(--sm-radius-sm)] border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[var(--sm-brand)] bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                    : "border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
                }`}
              >
                <span>{WEB_VITAL_DEVICE_LABELS[device]}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="rum-route-filter"
            className="text-sm font-medium text-[var(--sm-muted)]"
          >
            Rota:
          </label>
          <select
            id="rum-route-filter"
            aria-label="Filtrar por rota"
            value={routeValue}
            onChange={(event) =>
              setSelectedRoute(event.target.value || null)
            }
            className="min-h-10 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 py-1.5 text-sm text-[var(--sm-ink)]"
          >
            <option value="">Todas as rotas</option>
            {availableRoutes.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <AsyncState
          kind="loading"
          title="Carregando métricas RUM"
          description="Buscando percentis de Web Vitals coletados nos navegadores."
        />
      ) : isError ? (
        <AsyncState
          kind="error"
          title="Não foi possível carregar os Web Vitals"
          description="Verifique sua conexão e tente atualizar o painel."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-10 items-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2 text-sm font-bold text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
            >
              Tentar novamente
            </button>
          }
        />
      ) : !data || data.totals.samples === 0 ? (
        <AsyncState
          kind="empty"
          title="Nenhuma métrica Web Vitals recebida ainda"
          description="As amostras reais aparecerão aqui conforme as páginas forem carregadas e interagidas pelos usuários."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--sm-muted)]">
            <span>
              <strong className="font-semibold text-[var(--sm-ink)]">
                {data.totals.samples.toLocaleString("pt-BR")}
              </strong>{" "}
              amostras coletadas
            </span>
            <span>
              <strong className="font-semibold text-[var(--sm-ink)]">
                {data.totals.trackedRoutes}
              </strong>{" "}
              rotas monitoradas
            </span>
            <span>
              <strong className="font-semibold text-[var(--sm-ink)]">
                {data.totals.trackedSegments}
              </strong>{" "}
              segmentos rota/dispositivo
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WEB_VITAL_METRICS.map((metricName) => {
              const meta = WEB_VITAL_META[metricName]
              const stats = data.summary[metricName]
              return (
                <article
                  key={metricName}
                  aria-label={`Métrica ${meta.label}`}
                  className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--sm-ink)]">
                        {meta.label}
                      </h3>
                      <p className="text-xs text-[var(--sm-muted)]">
                        {meta.subtitle}
                      </p>
                    </div>
                    <RatingBadge rating={stats?.rating} />
                  </div>

                  <p className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--sm-ink)]">
                    {formatWebVitalValue(metricName, stats?.p75)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sm-muted)]">
                    {meta.targetLabel}
                  </p>

                  {stats ? (
                    <dl className="mt-3 grid grid-cols-2 gap-1 border-t border-[var(--sm-border)] pt-2 text-xs text-[var(--sm-muted)]">
                      <div>
                        <dt className="inline">p50: </dt>
                        <dd className="inline font-semibold text-[var(--sm-ink)]">
                          {formatWebVitalValue(metricName, stats.p50)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">p95: </dt>
                        <dd className="inline font-semibold text-[var(--sm-ink)]">
                          {formatWebVitalValue(metricName, stats.p95)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Amostras: </dt>
                        <dd className="inline font-semibold text-[var(--sm-ink)]">
                          {stats.count}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Bom: </dt>
                        <dd className="inline font-semibold text-[var(--sm-ink)]">
                          {stats.goodPercent.toFixed(1)}%
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Segmentação por dispositivo (p75)
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data.byDevice.map((entry) => (
                <div
                  key={entry.device}
                  className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DeviceIcon device={entry.device} />
                      <span className="text-sm font-bold text-[var(--sm-ink)]">
                        {WEB_VITAL_DEVICE_LABELS[entry.device]}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[var(--sm-muted)]">
                      {entry.samples.toLocaleString("pt-BR")} amostras
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="block text-[var(--sm-muted)]">LCP</span>
                      <span className="font-mono font-semibold text-[var(--sm-ink)]">
                        {formatWebVitalValue("LCP", entry.metrics.LCP?.p75)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[var(--sm-muted)]">INP</span>
                      <span className="font-mono font-semibold text-[var(--sm-ink)]">
                        {formatWebVitalValue("INP", entry.metrics.INP?.p75)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[var(--sm-muted)]">CLS</span>
                      <span className="font-mono font-semibold text-[var(--sm-ink)]">
                        {formatWebVitalValue("CLS", entry.metrics.CLS?.p75)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Rotas e dispositivos observados (p75)
            </h3>
            <div className="overflow-x-auto rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)]">
              <table className="min-w-full divide-y divide-[var(--sm-border)] text-left text-sm">
                <thead className="bg-[var(--sm-canvas)] text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Rota
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Dispositivo
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Amostras
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      LCP (p75)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      INP (p75)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      CLS (p75)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      FCP (p75)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      TTFB (p75)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sm-border)] bg-[var(--sm-surface)]">
                  {data.segments.map((segment) => (
                    <tr key={`${segment.route}|${segment.device}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--sm-ink)]">
                        {segment.route}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--sm-ink)]">
                        {WEB_VITAL_DEVICE_LABELS[segment.device]}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--sm-muted)]">
                        {segment.samples}
                      </td>
                      <SummaryMetricCell
                        metric="LCP"
                        stats={segment.metrics.LCP}
                      />
                      <SummaryMetricCell
                        metric="INP"
                        stats={segment.metrics.INP}
                      />
                      <SummaryMetricCell
                        metric="CLS"
                        stats={segment.metrics.CLS}
                      />
                      <SummaryMetricCell
                        metric="FCP"
                        stats={segment.metrics.FCP}
                      />
                      <SummaryMetricCell
                        metric="TTFB"
                        stats={segment.metrics.TTFB}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
