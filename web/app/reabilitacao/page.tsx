"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertTriangle,
  BookmarkPlus,
  Flag,
  Home,
  Info,
  Pencil,
  Printer,
  Repeat,
  Timer,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { RehabPrintDialog } from "@/components/features/physio/RehabPrintDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import {
  REHAB_ITEM_CATEGORY_LABELS,
  useFisio,
} from "@/hooks/features/useFisio"
import { api } from "@/lib/api"
import { isExerciseMediaUrl } from "@/lib/exercise-media-policy"
import { queryKeys } from "@/lib/query-keys"

export default function ReabilitacaoPage() {
  const [clientId, setClientId] = useState("")
  const [printOpen, setPrintOpen] = useState(false)
  const [updatingPhaseIdx, setUpdatingPhaseIdx] = useState<number | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const { user } = useAuth()
  const cache = useQueryClient()
  const clients = useClients("ACTIVE")
  const { rehabPlan, loading, error } = useFisio(clientId || undefined)

  const selectedPatient = clients.data?.find(c => c.id === clientId)
  const patientName = selectedPatient?.name ?? "Paciente"

  const handleSetCurrentPhase = async (phaseIndex: number) => {
    if (!rehabPlan || !clientId) return
    setUpdatingPhaseIdx(phaseIndex)
    try {
      await api.patch(`/rehab-plans/${rehabPlan.id}/phase`, {
        currentPhaseIndex: phaseIndex,
      })
      const sub = user?.sub ?? "anonymous"
      await Promise.all([
        cache.invalidateQueries({
          queryKey: queryKeys.rehabPlan(sub, clientId),
          exact: true,
        }),
        cache.invalidateQueries({
          queryKey: queryKeys.physioOverview(sub, clientId),
        }),
      ])
      toast.success("Fase atual do protocolo atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a fase atual.")
    } finally {
      setUpdatingPhaseIdx(null)
    }
  }

  const handleSaveTemplate = async () => {
    if (!rehabPlan) return
    setSavingTemplate(true)
    try {
      await api.patch(`/rehab-plans/${rehabPlan.id}/save-as-template`)
      if (user?.sub) {
        await cache.invalidateQueries({
          queryKey: queryKeys.physioTemplates(user.sub),
        })
      }
      toast.success("Protocolo salvo nos seus modelos.")
    } catch {
      toast.error("Não foi possível salvar como modelo.")
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 pb-20 animate-in fade-in duration-500 md:p-10">
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Reabilitação</h1>
          <p className="text-slate-500">
            Protocolos de reabilitação dos seus pacientes.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="rehab-client" className="block font-medium">
          Paciente
        </label>
        <select
          id="rehab-client"
          value={clientId}
          onChange={event => setClientId(event.target.value)}
          disabled={clients.isPending || clients.isError}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
        >
          <option value="">Selecione um paciente</option>
          {clients.data?.map(client => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        {clients.isError && (
          <p role="alert">Não foi possível carregar os pacientes.</p>
        )}
        {clientId && (
          <Link
            className="inline-flex min-h-11 items-center text-purple-700 underline"
            href={`/clientes/${clientId}/nova-reabilitacao`}
          >
            Prescrever protocolo
          </Link>
        )}
      </div>

      {/* FEEDBACK DE ERRO */}
      {error && (
        <div className="flex items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-500" />
          <div>
            <h3 className="font-bold text-rose-800">Ops, algo correu mal</h3>
            <p className="mt-1 text-sm text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border border-slate-200 border-t-[var(--sm-brand)]"></div>
          <p className="font-medium text-slate-500">Carregando protocolo...</p>
        </div>
      ) : !rehabPlan && !error ? (
        /* ESTADO VAZIO (Sem Protocolo) */
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <Activity className="mx-auto mb-3 h-12 w-12 text-slate-200" />
          <p className="font-medium text-slate-500">
            {clientId
              ? "Este paciente não possui protocolo de reabilitação ativo."
              : "Selecione um paciente para consultar o protocolo."}
          </p>
        </div>
      ) : (
        rehabPlan && (
          /* DADOS REAIS */
          <div className="space-y-6">
            <div className="rounded-2xl bg-[var(--sm-brand)] p-6 text-[var(--sm-on-brand)] shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{rehabPlan.title}</h2>
                  {rehabPlan.goal ? (
                    <p className="mt-1 opacity-90">{rehabPlan.goal}</p>
                  ) : null}
                  {rehabPlan.durationWeeks != null ? (
                    <p className="mt-1 text-xs font-semibold opacity-80">
                      Duração prevista: {rehabPlan.durationWeeks} semanas
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => setPrintOpen(true)}
                  >
                    <Printer className="mr-1.5 h-4 w-4" />
                    PDF Exercícios para Casa
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingTemplate}
                    onClick={handleSaveTemplate}
                    className="min-h-11 border-white/40 bg-white/10 text-white hover:bg-white/20"
                  >
                    <BookmarkPlus className="mr-1.5 h-4 w-4" />
                    Salvar como modelo
                  </Button>
                  <Link
                    href={`/clientes/${clientId}/nova-reabilitacao`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-3.5 text-sm font-bold text-white hover:bg-white/20"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar protocolo
                  </Link>
                </div>
              </div>

              {rehabPlan.notes && (
                <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4 text-sm">
                  <h4 className="mb-1 flex items-center gap-2 font-bold">
                    <Info className="h-4 w-4" /> Orientações para casa
                  </h4>
                  <p>{rehabPlan.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {rehabPlan.sessions?.map((session, sessionIdx) => {
                const isCurrent =
                  (rehabPlan.currentPhaseIndex ?? 0) === sessionIdx
                return (
                  <div
                    key={session.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sm-border)] bg-[var(--sm-brand-subtle)] px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-[var(--sm-ink)]">
                          {session.name}
                        </h3>
                        {isCurrent ? (
                          <Badge className="bg-emerald-600 text-white">
                            Fase atual
                          </Badge>
                        ) : null}
                        {session.estimatedWeeks != null ? (
                          <Badge variant="outline">
                            {session.estimatedWeeks} sem.
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {session.focus && (
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                            {session.focus}
                          </span>
                        )}
                        {!isCurrent ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updatingPhaseIdx === sessionIdx}
                            onClick={() => handleSetCurrentPhase(sessionIdx)}
                            className="h-8 text-xs"
                          >
                            <Flag className="mr-1 h-3.5 w-3.5" />
                            Definir como fase atual
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {session.progressionCriteria ? (
                      <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-700">
                        <strong className="uppercase tracking-wide text-purple-800">
                          Critérios de avanço:{" "}
                        </strong>
                        {session.progressionCriteria}
                      </div>
                    ) : null}

                    <div className="divide-y divide-slate-100">
                      {session.exercises?.map((ex, idx) => {
                        const illustration =
                          ex.demonstrationSnapshot?.assets?.find(
                            asset =>
                              asset.type === "IMAGE" &&
                              asset.displayAllowed === true &&
                              isExerciseMediaUrl(asset.url),
                          )
                        return (
                          <div
                            key={ex.id}
                            className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-slate-50 md:flex-row md:items-start"
                          >
                            <div className="flex flex-1 items-start gap-3">
                              <span className="text-xl font-black text-purple-200">
                                {idx + 1}.
                              </span>
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-bold text-slate-800">
                                    {ex.name}
                                  </p>
                                  {ex.category ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[11px]"
                                    >
                                      {REHAB_ITEM_CATEGORY_LABELS[ex.category]}
                                    </Badge>
                                  ) : null}
                                  {ex.isHomeExercise ? (
                                    <Badge
                                      variant="outline"
                                      className="border-purple-200 bg-purple-50 text-[11px] text-purple-800"
                                    >
                                      <Home className="mr-1 h-3 w-3" />
                                      Para casa
                                      {ex.homeFrequency
                                        ? ` · ${ex.homeFrequency}`
                                        : ""}
                                    </Badge>
                                  ) : null}
                                </div>

                                {ex.modalityParams?.modality ? (
                                  <p className="rounded bg-purple-50/70 px-2.5 py-1 text-xs text-purple-900">
                                    {[
                                      `Recurso: ${ex.modalityParams.modality}`,
                                      ex.modalityParams.frequency
                                        ? `Freq.: ${ex.modalityParams.frequency}`
                                        : "",
                                      ex.modalityParams.pulseWidth
                                        ? `Pulso: ${ex.modalityParams.pulseWidth}`
                                        : "",
                                      ex.modalityParams.intensity
                                        ? `Dose: ${ex.modalityParams.intensity}`
                                        : "",
                                      ex.modalityParams.emissionMode
                                        ? `Modo: ${ex.modalityParams.emissionMode}`
                                        : "",
                                      ex.modalityParams.durationMinutes != null
                                        ? `${ex.modalityParams.durationMinutes} min`
                                        : "",
                                      ex.modalityParams.applicationSite
                                        ? `Local: ${ex.modalityParams.applicationSite}`
                                        : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                ) : null}

                                {ex.patientInstructions ? (
                                  <p className="text-xs text-slate-700">
                                    <strong>Ao paciente: </strong>
                                    {ex.patientInstructions}
                                  </p>
                                ) : null}

                                {ex.notes && (
                                  <p className="inline-block rounded bg-slate-100 px-2 py-1 text-sm text-slate-500">
                                    {ex.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 pl-8 md:pl-0">
                              <div className="flex gap-2">
                                {ex.sets && (
                                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600">
                                    <Timer className="h-4 w-4 text-purple-500" />{" "}
                                    {ex.sets}
                                  </div>
                                )}
                                {ex.reps && (
                                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600">
                                    <Repeat className="h-4 w-4 text-purple-500" />{" "}
                                    {ex.reps}
                                  </div>
                                )}
                              </div>

                              {illustration ? (
                                <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-md bg-slate-800 p-1.5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={illustration.url}
                                    alt={illustration.alt}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <RehabPrintDialog
              open={printOpen}
              plan={rehabPlan}
              patientName={patientName}
              defaultMode="home-program"
              onClose={() => setPrintOpen(false)}
            />
          </div>
        )
      )}
    </div>
  )
}
