"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookmarkPlus,
  BookOpen,
  CheckCircle2,
  Flag,
  Info,
  LayoutList,
  Plus,
  Printer,
  Save,
  Target,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { RehabExerciseCatalogDialog } from "@/components/features/physio/RehabExerciseCatalogDialog"
import { RehabExerciseEditorCard } from "@/components/features/physio/RehabExerciseEditorCard"
import { RehabPrintDialog } from "@/components/features/physio/RehabPrintDialog"
import { RehabProtocolPickerDialog } from "@/components/features/physio/RehabProtocolPickerDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import type {
  CuratedRehabProtocol,
  PhysioExerciseCatalogItem,
  RehabPlan,
} from "@/hooks/features/useFisio"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import {
  createEmptyExercise,
  draftToPrintablePlan,
  mapPlanToDraftSessions,
  nextDraftId,
  serializeRehabBody,
  type DraftRehabExercise,
  type DraftRehabSession,
} from "@/lib/rehab-presets"
import type { Client } from "@/types/client"

export default function NovaReabilitacaoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const cache = useQueryClient()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [patientName, setPatientName] = useState("Carregando...")
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)

  const [protocolPickerOpen, setProtocolPickerOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [catalogTarget, setCatalogTarget] = useState<{
    sessionId: string
    exerciseId: string
  } | null>(null)

  const [planInfo, setPlanInfo] = useState({
    title: "Protocolo de Reabilitação",
    goal: "Controle de dor e ganho de ADM",
    durationWeeks: 4,
    notes: "",
  })

  const [sessions, setSessions] = useState<DraftRehabSession[]>(() => [
    {
      id: "initial-session-1",
      name: "Fase 1 - Analgesia",
      focus: "Eletroterapia e Terapia Manual",
      progressionCriteria: "",
      estimatedWeeks: "",
      exercises: [
        {
          id: "initial-exercise-1",
          name: "TENS (Corrente Convencional)",
          sets: "20 min",
          reps: "Contínuo",
          notes: "100Hz / 50µs no local da dor",
          category: "KINESIOTHERAPY",
          modalityParams: null,
          isHomeExercise: false,
          homeFrequency: "",
          patientInstructions: "",
          catalogExerciseId: null,
          demonstrationSnapshot: null,
        },
      ],
    },
  ])

  useEffect(() => {
    const controller = new AbortController()
    const loadData = async () => {
      try {
        const [clientRes, planRes] = await Promise.all([
          api.get<Client>(`/clients/${params.id}`, { signal: controller.signal }),
          api.get<RehabPlan | null>(`/rehab-plans/client/${params.id}/active`, { signal: controller.signal }),
        ])
        if (controller.signal.aborted) return
        setPatientName(clientRes.data.name)

        const planRes = await api.get<RehabPlan | null>(
          `/rehab-plans/client/${params.id}/active`,
        )
        if (planRes.data) {
          const active = planRes.data
          setActivePlanId(active.id)
          setCurrentPhaseIndex(active.currentPhaseIndex ?? 0)
          setPlanInfo({
            title: active.title,
            goal: active.goal || "",
            durationWeeks: active.durationWeeks || 4,
            notes: active.notes || "",
          })

          if (active.sessions && active.sessions.length > 0) {
            setSessions(mapPlanToDraftSessions(active.sessions))
          }
        }
      } catch {
        if (controller.signal.aborted) return
        toast.error("Não foi possível carregar o prontuário e o protocolo.")
      }
    }
    void loadData()
  }, [params.id])

  const printablePlan = useMemo(
    () =>
      draftToPrintablePlan({
        id: activePlanId ?? "draft",
        ...planInfo,
        currentPhaseIndex,
        sessions,
      }),
    [activePlanId, planInfo, currentPhaseIndex, sessions],
  )

  const invalidatePhysioQueries = async () => {
    const sub = user?.sub ?? "anonymous"
    await Promise.all([
      cache.invalidateQueries({
        queryKey: queryKeys.rehabPlan(sub, params.id),
        exact: true,
      }),
      cache.invalidateQueries({ queryKey: queryKeys.physioWorkspace(sub) }),
      cache.invalidateQueries({
        queryKey: queryKeys.physioOverview(sub, params.id),
      }),
    ])
  }

  const addSession = () => {
    setSessions(prev => [
      ...prev,
      {
        id: nextDraftId("s"),
        name: `Fase ${prev.length + 1}`,
        focus: "",
        progressionCriteria: "",
        estimatedWeeks: "",
        exercises: [],
      },
    ])
  }

  const removeSession = (id: string) => {
    setSessions(prev => {
      const removedIdx = prev.findIndex(s => s.id === id)
      const next = prev.filter(s => s.id !== id)
      setCurrentPhaseIndex(current => {
        if (next.length === 0) return 0
        if (current >= next.length) return next.length - 1
        if (removedIdx >= 0 && removedIdx < current) return Math.max(0, current - 1)
        return current
      })
      return next
    })
  }

  const moveSession = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sessions.length) return
    setSessions(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(index, 1)
      copy.splice(target, 0, moved)
      return copy
    })
    setCurrentPhaseIndex(current => {
      if (current === index) return target
      if (current === target) return index
      return current
    })
  }

  const addExercise = (sessionId: string) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              exercises: [...session.exercises, createEmptyExercise()],
            }
          : session,
      ),
    )
  }

  const updateExercise = (
    sessionId: string,
    exerciseId: string,
    updater: (ex: DraftRehabExercise) => DraftRehabExercise,
  ) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              exercises: session.exercises.map(ex =>
                ex.id === exerciseId ? updater(ex) : ex,
              ),
            }
          : session,
      ),
    )
  }

  const moveExercise = (
    sessionId: string,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => {
    setSessions(prev =>
      prev.map(session => {
        if (session.id !== sessionId) return session
        const target = exerciseIndex + direction
        if (target < 0 || target >= session.exercises.length) return session
        const copy = [...session.exercises]
        const [moved] = copy.splice(exerciseIndex, 1)
        copy.splice(target, 0, moved)
        return { ...session, exercises: copy }
      }),
    )
  }

  const removeExercise = (sessionId: string, exerciseId: string) => {
    setSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              exercises: session.exercises.filter(e => e.id !== exerciseId),
            }
          : session,
      ),
    )
  }

  const validateBeforeSave = () => {
    if (!planInfo.title.trim()) {
      toast.error("Informe o título do protocolo de reabilitação.")
      return false
    }
    if (sessions.length === 0 || sessions.some(s => s.exercises.length === 0)) {
      toast.error("Todas as fases precisam ter pelo menos uma terapia/exercício!")
      return false
    }
    if (
      sessions.some(
        s => !s.name.trim() || s.exercises.some(ex => !ex.name.trim()),
      )
    ) {
      toast.error("Preencha o nome de todas as fases e terapias/exercícios.")
      return false
    }
    return true
  }

  const handleSavePlan = async () => {
    if (!validateBeforeSave()) return
    setLoading(true)
    try {
      const body = serializeRehabBody({
        ...planInfo,
        currentPhaseIndex,
        sessions,
      })
      await api.post("/rehab-plans", {
        ...body,
        clientId: params.id,
      })
      await invalidatePhysioQueries()
      toast.success("Plano de Reabilitação salvo com sucesso!")
      router.push(`/clientes/${params.id}`)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error("Prontuário arquivado: novas prescrições estão bloqueadas.")
      } else {
        toast.error("Erro ao salvar reabilitação. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateInPlace = async () => {
    if (!activePlanId || !validateBeforeSave()) return
    setLoading(true)
    try {
      const body = serializeRehabBody({
        ...planInfo,
        currentPhaseIndex,
        sessions,
      })
      await api.patch(`/rehab-plans/${activePlanId}`, body)
      await invalidatePhysioQueries()
      toast.success("Alterações salvas no protocolo ativo!")
      router.push(`/clientes/${params.id}`)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error("Prontuário arquivado: alterações estão bloqueadas.")
      } else {
        toast.error("Erro ao atualizar protocolo. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!validateBeforeSave()) return
    setSavingTemplate(true)
    try {
      const body = serializeRehabBody({
        ...planInfo,
        currentPhaseIndex: 0,
        sessions,
      })
      await api.post("/rehab-plans/templates", body)
      if (user?.sub) {
        await cache.invalidateQueries({
          queryKey: queryKeys.physioTemplates(user.sub),
        })
      }
      toast.success("Modelo salvo na sua biblioteca de protocolos!")
    } catch {
      toast.error("Não foi possível salvar o modelo.")
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleApplyProtocol = (protocol: CuratedRehabProtocol | RehabPlan) => {
    setPlanInfo({
      title: protocol.title,
      goal: protocol.goal || "",
      durationWeeks: protocol.durationWeeks || 4,
      notes: protocol.notes || "",
    })
    setCurrentPhaseIndex(0)
    setSessions(mapPlanToDraftSessions(protocol.sessions))
    toast.success(`Protocolo "${protocol.title}" carregado para edição.`)
  }

  const handleSelectCatalogExercise = (item: PhysioExerciseCatalogItem) => {
    if (!catalogTarget) return
    updateExercise(catalogTarget.sessionId, catalogTarget.exerciseId, prev => ({
      ...prev,
      name: item.name,
      catalogExerciseId: item.id,
      demonstrationSnapshot: item.demonstration,
      patientInstructions: prev.patientInstructions.trim()
        ? prev.patientInstructions
        : (item.demonstration?.instruction ?? ""),
    }))
    setCatalogTarget(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full space-y-6 px-6 md:px-12 lg:px-20 print:max-w-4xl print:px-0">
        {/* CABEÇALHO */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={`/clientes/${params.id}`}>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Voltar ao prontuário"
                className="rounded-full hover:bg-slate-200"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Prescrição Fisioterapêutica
              </h1>
              <p className="font-medium text-slate-500">
                Paciente:{" "}
                <span className="text-purple-600">{patientName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100"
              onClick={() => setProtocolPickerOpen(true)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Protocolos Prontos
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={savingTemplate}
              className="min-h-11 border-slate-300 text-slate-700"
              onClick={handleSaveAsTemplate}
            >
              <BookmarkPlus className="mr-2 h-4 w-4" />
              {savingTemplate ? "Salvando modelo..." : "Salvar como Modelo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-slate-300 text-slate-700"
              onClick={() => setPrintDialogOpen(true)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            {activePlanId ? (
              <Button
                type="button"
                onClick={handleUpdateInPlace}
                disabled={loading}
                variant="outline"
                className="min-h-11 border-purple-600 font-bold text-purple-700 hover:bg-purple-50"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleSavePlan}
              disabled={loading}
              className="min-h-11 bg-purple-600 px-6 text-base text-white shadow-md hover:bg-purple-700"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {loading ? "A Salvar..." : "Finalizar Protocolo"}
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* PAINEL LATERAL DE METAS */}
          <div className="sticky top-8 space-y-6 lg:col-span-3 print:hidden">
            <Card className="overflow-hidden border-0 bg-white shadow-lg">
              <CardHeader className="border-b-4 border-purple-500 bg-slate-800 py-4 text-white">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-purple-400" /> Metas do
                  Tratamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-slate-50/50 p-5">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-600">
                    Diagnóstico / Protocolo
                  </Label>
                  <Input
                    value={planInfo.title}
                    onChange={e =>
                      setPlanInfo({ ...planInfo, title: e.target.value })
                    }
                    className="bg-white font-semibold"
                    placeholder="Ex: Pós-Op LCA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-600">
                    Objetivo Clínico
                  </Label>
                  <Input
                    value={planInfo.goal}
                    onChange={e =>
                      setPlanInfo({ ...planInfo, goal: e.target.value })
                    }
                    className="bg-white font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-600">
                    Duração Total (Semanas)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={104}
                    value={planInfo.durationWeeks}
                    onChange={e =>
                      setPlanInfo({
                        ...planInfo,
                        durationWeeks: Number(e.target.value),
                      })
                    }
                    className="bg-purple-50 text-center text-lg font-bold text-purple-700"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-purple-50/50 shadow-sm">
              <CardHeader className="border-b border-purple-100 bg-purple-50 py-4">
                <CardTitle className="flex items-center gap-2 text-sm text-purple-800">
                  <LayoutList className="h-4 w-4" /> Resumo das Fases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {sessions.map((session, idx) => (
                  <div
                    key={session.id}
                    className="flex flex-col rounded-lg border bg-white px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        {session.name}
                      </span>
                      {currentPhaseIndex === idx ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Atual
                        </Badge>
                      ) : null}
                    </div>
                    <span className="truncate text-xs font-medium text-slate-500">
                      {session.focus || "Sem foco"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ÁREA PRINCIPAL: AS FASES */}
          <div className="space-y-6 lg:col-span-9 print:w-full">
            {sessions.map((session, index) => (
              <Card
                key={session.id}
                className="overflow-hidden border border-slate-200 shadow-md"
              >
                <CardHeader className="border-b-4 border-purple-500 bg-slate-800 py-3">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="flex w-full flex-1 flex-wrap items-center gap-2.5">
                      <Input
                        value={session.name}
                        onChange={e =>
                          setSessions(prev =>
                            prev.map((s, sIdx) =>
                              sIdx === index
                                ? { ...s, name: e.target.value }
                                : s,
                            ),
                          )
                        }
                        className="w-44 bg-white text-center font-black text-slate-800"
                      />
                      <Input
                        placeholder="Objetivo da Fase (Ex: Mobilidade e Analgesia)"
                        value={session.focus}
                        onChange={e =>
                          setSessions(prev =>
                            prev.map((s, sIdx) =>
                              sIdx === index
                                ? { ...s, focus: e.target.value }
                                : s,
                            ),
                          )
                        }
                        className="min-w-[200px] flex-1 border-none bg-slate-700/50 font-bold text-white shadow-none placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant={currentPhaseIndex === index ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPhaseIndex(index)}
                        className={
                          currentPhaseIndex === index
                            ? "h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                            : "h-8 text-slate-200 hover:bg-slate-700"
                        }
                      >
                        <Flag className="mr-1.5 h-3.5 w-3.5" />
                        {currentPhaseIndex === index
                          ? "Fase atual"
                          : "Marcar fase atual"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        aria-label={`Mover fase ${index + 1} para cima`}
                        onClick={() => moveSession(index, -1)}
                        className="h-8 w-8 text-slate-200 hover:bg-slate-700"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index >= sessions.length - 1}
                        aria-label={`Mover fase ${index + 1} para baixo`}
                        onClick={() => moveSession(index, 1)}
                        className="h-8 w-8 text-slate-200 hover:bg-slate-700"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 p-2 text-rose-400 hover:bg-slate-700 hover:text-rose-300"
                        onClick={() => removeSession(session.id)}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" /> Apagar Fase
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-3 sm:grid-cols-4">
                    <div className="sm:col-span-3">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Critérios de Progressão da Fase
                      </Label>
                      <Input
                        value={session.progressionCriteria}
                        onChange={e =>
                          setSessions(prev =>
                            prev.map((s, sIdx) =>
                              sIdx === index
                                ? { ...s, progressionCriteria: e.target.value }
                                : s,
                            ),
                          )
                        }
                        placeholder="Critérios objetivos para avançar de fase (ex: EVA <= 2, ADM >= 110°, apoio sem dor)..."
                        className="mt-1 h-9 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Semanas previstas
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={104}
                        value={session.estimatedWeeks}
                        onChange={e =>
                          setSessions(prev =>
                            prev.map((s, sIdx) =>
                              sIdx === index
                                ? { ...s, estimatedWeeks: e.target.value }
                                : s,
                            ),
                          )
                        }
                        placeholder="Ex: 3"
                        className="mt-1 h-9 bg-white text-center text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid">
                    <div className="col-span-5">Terapia / Exercício</div>
                    <div className="col-span-3 text-center">Duração / Séries</div>
                    <div className="col-span-3 text-center">Frequência / Reps</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {session.exercises.map((ex, exIdx) => (
                      <RehabExerciseEditorCard
                        key={ex.id}
                        sessionId={session.id}
                        exercise={ex}
                        index={exIdx}
                        total={session.exercises.length}
                        onChange={updater =>
                          updateExercise(session.id, ex.id, updater)
                        }
                        onMove={dir => moveExercise(session.id, exIdx, dir)}
                        onRemove={() => removeExercise(session.id, ex.id)}
                        onOpenCatalog={() =>
                          setCatalogTarget({
                            sessionId: session.id,
                            exerciseId: ex.id,
                          })
                        }
                      />
                    ))}
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50 p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full font-bold text-purple-600 hover:bg-purple-100"
                      onClick={() => addExercise(session.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Adicionar Terapia /
                      Exercício
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              onClick={addSession}
              className="h-14 w-full border-2 border-dashed border-purple-300 bg-white text-lg font-bold text-purple-800 transition-all hover:border-purple-400 hover:bg-purple-50"
            >
              <Plus className="mr-2 h-5 w-5" /> Criar Nova Fase de Reabilitação
            </Button>

            <Card className="mt-12 border-0 bg-slate-800 text-white shadow-lg">
              <CardHeader className="border-b border-slate-700 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-purple-400" /> Orientações para
                  Casa
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <textarea
                  value={planInfo.notes}
                  onChange={e =>
                    setPlanInfo({ ...planInfo, notes: e.target.value })
                  }
                  placeholder="Orientações sobre gelo, restrições de movimento, ergonomia..."
                  className="min-h-[120px] w-full resize-y rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-purple-500"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <RehabProtocolPickerDialog
        open={protocolPickerOpen}
        onClose={() => setProtocolPickerOpen(false)}
        onSelectProtocol={handleApplyProtocol}
      />

      <RehabExerciseCatalogDialog
        open={catalogTarget !== null}
        onClose={() => setCatalogTarget(null)}
        onSelectExercise={handleSelectCatalogExercise}
      />

      <RehabPrintDialog
        open={printDialogOpen}
        plan={printablePlan}
        patientName={patientName}
        onClose={() => setPrintDialogOpen(false)}
      />
    </div>
  )
}
