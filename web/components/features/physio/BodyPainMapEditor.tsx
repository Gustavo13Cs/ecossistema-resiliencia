"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BODY_PAIN_REGIONS,
  BODY_PAIN_SYMPTOM_LABELS,
  type BodyPainRegionDef,
} from "@/lib/physio-exam-catalog"
import type {
  BodyPainMapEntry,
  BodyPainSymptomType,
  BodyPainView,
} from "@/types/physio"

function intensityBadgeColor(intensity: number): string {
  if (intensity >= 7) return "bg-rose-600 text-white border-rose-700"
  if (intensity >= 4) return "bg-amber-500 text-slate-950 border-amber-600"
  return "bg-purple-600 text-white border-purple-700"
}

function BodySilhouetteSvg({ view }: { view: BodyPainView }) {
  return (
    <svg
      viewBox="0 0 200 360"
      aria-hidden="true"
      className="h-full w-full select-none"
    >
      {/* Head & neck */}
      <circle
        cx="100"
        cy="28"
        r="17"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      <rect
        x="91"
        y="45"
        width="18"
        height="18"
        rx="4"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Torso */}
      <path
        d="M66 66 Q100 58 134 66 L128 164 Q100 172 72 164 Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Spine / midline reference */}
      <line
        x1="100"
        y1="66"
        x2="100"
        y2="162"
        stroke={view === "POSTERIOR" ? "#cbd5e1" : "#e2e8f0"}
        strokeDasharray={view === "POSTERIOR" ? "4 3" : "2 4"}
        strokeWidth="1.5"
      />
      {/* Arms */}
      <path
        d="M66 68 L48 134 L36 188 L49 192 L60 138 L71 84"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M134 68 L152 134 L164 188 L151 192 L140 138 L129 84"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Pelvis / Legs */}
      <path
        d="M72 164 L68 254 L70 338 L89 342 L92 254 L100 186 L108 254 L111 342 L130 338 L132 254 L128 164 Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BodyPainMapEditor({
  entries,
  onChange,
}: {
  entries: BodyPainMapEntry[]
  onChange: (next: BodyPainMapEntry[]) => void
}) {
  const [quickRegionId, setQuickRegionId] = useState(BODY_PAIN_REGIONS[0].id)

  const findEntry = (region: BodyPainRegionDef) =>
    entries.find(
      (item) => item.region === region.label && item.view === region.view,
    )

  const toggleRegion = (region: BodyPainRegionDef) => {
    const exists = findEntry(region)
    if (exists) {
      onChange(
        entries.filter(
          (item) =>
            !(item.region === region.label && item.view === region.view),
        ),
      )
    } else {
      onChange([
        ...entries,
        {
          region: region.label,
          view: region.view,
          intensity: 5,
          symptomType: "ACHING",
        },
      ])
    }
  }

  const addQuickRegion = () => {
    const region = BODY_PAIN_REGIONS.find((r) => r.id === quickRegionId)
    if (!region) return
    if (findEntry(region)) return
    onChange([
      ...entries,
      {
        region: region.label,
        view: region.view,
        intensity: 5,
        symptomType: "ACHING",
      },
    ])
  }

  const updateEntry = (
    index: number,
    patch: Partial<BodyPainMapEntry>,
  ) => {
    onChange(
      entries.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    )
  }

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, idx) => idx !== index))
  }

  const renderMapView = (view: BodyPainView, title: string) => {
    const regions = BODY_PAIN_REGIONS.filter((r) => r.view === view)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
          {title}
        </p>
        <div className="relative mx-auto aspect-[200/360] w-full max-w-[180px]">
          <BodySilhouetteSvg view={view} />
          {regions.map((region) => {
            const active = findEntry(region)
            return (
              <button
                key={region.id}
                type="button"
                aria-label={`${region.label} (${title})`}
                aria-pressed={Boolean(active)}
                title={region.label}
                onClick={() => toggleRegion(region)}
                style={{
                  left: `${(region.cx / 200) * 100}%`,
                  top: `${(region.cy / 360) * 100}%`,
                }}
                className={`absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-extrabold shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                  active
                    ? intensityBadgeColor(active.intensity)
                    : "border-slate-400 bg-white/90 text-slate-700 hover:border-purple-500 hover:bg-purple-50"
                }`}
              >
                {active ? active.intensity : "+"}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Mapa Corporal de Dor
          </h3>
          <p className="text-xs text-slate-500">
            Clique nos pontos anatômicos para marcar ou remover regiões sintomáticas.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {entries.length} {entries.length === 1 ? "região marcada" : "regiões marcadas"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderMapView("ANTERIOR", "Vista Anterior")}
        {renderMapView("POSTERIOR", "Vista Posterior")}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="pain-map-quick-region" className="text-xs font-bold text-slate-700">
            Selecionar região pela lista
          </Label>
          <select
            id="pain-map-quick-region"
            value={quickRegionId}
            onChange={(e) => setQuickRegionId(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            {BODY_PAIN_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.view === "ANTERIOR" ? "Anterior" : "Posterior"})
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={addQuickRegion}
        >
          <Plus className="mr-1 size-4" />
          Marcar região
        </Button>
      </div>

      {entries.length > 0 ? (
        <ul className="space-y-2.5" aria-label="Regiões marcadas no mapa de dor">
          {entries.map((entry, idx) => (
            <li
              key={`${entry.view}:${entry.region}`}
              className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1.2fr_90px_1fr_auto]"
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{entry.region}</p>
                <p className="text-xs text-slate-500">
                  {entry.view === "ANTERIOR" ? "Vista Anterior" : "Vista Posterior"}
                </p>
              </div>
              <div>
                <Label
                  htmlFor={`pain-map-eva-${idx}`}
                  className="text-[11px] font-semibold text-slate-500"
                >
                  EVA (0–10)
                </Label>
                <Input
                  id={`pain-map-eva-${idx}`}
                  type="number"
                  min={0}
                  max={10}
                  value={entry.intensity}
                  onChange={(e) => {
                    const num = Math.max(0, Math.min(10, Number(e.target.value) || 0))
                    updateEntry(idx, { intensity: num })
                  }}
                  className="h-9 text-sm font-bold"
                />
              </div>
              <div>
                <Label
                  htmlFor={`pain-map-sym-${idx}`}
                  className="text-[11px] font-semibold text-slate-500"
                >
                  Característica
                </Label>
                <select
                  id={`pain-map-sym-${idx}`}
                  value={entry.symptomType}
                  onChange={(e) =>
                    updateEntry(idx, {
                      symptomType: e.target.value as BodyPainSymptomType,
                    })
                  }
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800"
                >
                  {(
                    Object.keys(BODY_PAIN_SYMPTOM_LABELS) as BodyPainSymptomType[]
                  ).map((key) => (
                    <option key={key} value={key}>
                      {BODY_PAIN_SYMPTOM_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover ${entry.region}`}
                onClick={() => removeEntry(idx)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
