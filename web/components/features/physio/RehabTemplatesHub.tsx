"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { CheckCircle2, Layers, Plus, Search, Trash2, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import {
  REHAB_ITEM_CATEGORY_LABELS,
  type CuratedRehabProtocol,
  type RehabPlan,
  type RehabSession,
} from "@/hooks/features/useFisio"
import {
  usePhysioProtocolCatalog,
  usePhysioTemplates,
} from "@/hooks/features/useRehabCatalog"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

type ApplySource =
  | { kind: "curated"; data: CuratedRehabProtocol }
  | { kind: "template"; data: RehabPlan }

function serializeSessionsForDto(
  sessions: Array<{
    name: string
    focus?: string | null
    progressionCriteria?: string | null
    estimatedWeeks?: number | null
    exercises: Array<{
      name: string
      sets?: string | null
      reps?: string | null
      notes?: string | null
      category?: RehabSession["exercises"][number]["category"]
      modalityParams?: RehabSession["exercises"][number]["modalityParams"]
      isHomeExercise?: boolean
      homeFrequency?: string | null
      patientInstructions?: string | null
      catalogExerciseId?: string | null
    }>
  }>,
) {
  return sessions.map((session) => ({
    name: session.name,
    ...(session.focus ? { focus: session.focus } : {}),
    ...(session.progressionCriteria
      ? { progressionCriteria: session.progressionCriteria }
      : {}),
    ...(session.estimatedWeeks != null
      ? { estimatedWeeks: session.estimatedWeeks }
      : {}),
    exercises: session.exercises.map((ex) => ({
      name: ex.name,
      ...(ex.sets ? { sets: ex.sets } : {}),
      ...(ex.reps ? { reps: ex.reps } : {}),
      ...(ex.notes ? { notes: ex.notes } : {}),
      ...(ex.category ? { category: ex.category } : {}),
      ...(ex.modalityParams ? { modalityParams: ex.modalityParams } : {}),
      ...(typeof ex.isHomeExercise === "boolean"
        ? { isHomeExercise: ex.isHomeExercise }
        : {}),
      ...(ex.homeFrequency ? { homeFrequency: ex.homeFrequency } : {}),
      ...(ex.patientInstructions
        ? { patientInstructions: ex.patientInstructions }
        : {}),
      ...(ex.catalogExerciseId
        ? { catalogExerciseId: ex.catalogExerciseId }
        : {}),
    })),
  }))
}

export function RehabTemplatesHub() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isPhysio = Boolean(user?.sub && user.role === "PHYSIO")
  const sub = user?.sub ?? "anonymous"

  const catalogQuery = usePhysioProtocolCatalog(isPhysio)
  const templatesQuery = usePhysioTemplates(isPhysio)
  const clientsQuery = useClients("ACTIVE", { enabled: isPhysio })

  const [search, setSearch] = useState("")
  const [applySource, setApplySource] = useState<ApplySource | null>(null)
  const [targetClientId, setTargetClientId] = useState("")
  const [applyTitle, setApplyTitle] = useState("")
  const [applyGoal, setApplyGoal] = useState("")
  const [applying, setApplying] = useState(false)

  const [newTemplateOpen, setNewTemplateOpen] = useState(false)
  const [tplTitle, setTplTitle] = useState("")
  const [tplGoal, setTplGoal] = useState("")
  const [tplWeeks, setTplWeeks] = useState("6")
  const [tplPhaseName, setTplPhaseName] = useState("Fase 1 — Analgesia e mobilidade")
  const [tplExerciseName, setTplExerciseName] = useState("Cinesioterapia assistida")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const activeClients = useMemo(
    () => clientsQuery.data ?? [],
    [clientsQuery.data],
  )

  const filteredCurated = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = catalogQuery.data ?? []
    if (!q) return list
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.conditionArea.toLowerCase().includes(q) ||
        item.goal.toLowerCase().includes(q),
    )
  }, [catalogQuery.data, search])

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = templatesQuery.data ?? []
    if (!q) return list
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.goal ?? "").toLowerCase().includes(q),
    )
  }, [templatesQuery.data, search])

  const accessDenied =
    denied ||
    [catalogQuery.error, templatesQuery.error, clientsQuery.error].some(
      (err) => isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0),
    )

  if (!isPhysio) return null

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar os modelos de protocolo."
          action={<ReauthenticateButton />}
        />
      </div>
    )
  }

  function openApplyModal(source: ApplySource) {
    setApplySource(source)
    setTargetClientId(activeClients[0]?.id ?? "")
    setApplyTitle(source.data.title)
    setApplyGoal(source.data.goal ?? "")
  }

  async function handleApplyProtocol(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!applySource || !targetClientId) return
    setApplying(true)
    try {
      const source = applySource.data
      await api.post("/rehab-plans", {
        clientId: targetClientId,
        title: applyTitle.trim() || source.title,
        ...(applyGoal.trim() ? { goal: applyGoal.trim() } : {}),
        ...(source.durationWeeks != null
          ? { durationWeeks: source.durationWeeks }
          : {}),
        ...(source.notes ? { notes: source.notes } : {}),
        sessions: serializeSessionsForDto(source.sessions),
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.rehabPlan(sub, targetClientId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.physioOverview(sub, targetClientId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.physioWorkspace(sub),
        }),
      ])
      toast.success("Protocolo aplicado ao paciente com sucesso.")
      const destinationClient = targetClientId
      setApplySource(null)
      router.push(`/clientes/${destinationClient}`)
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        setDenied(true)
        return
      }
      toast.error("Não foi possível aplicar o protocolo ao paciente.")
    } finally {
      setApplying(false)
    }
  }

  async function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = tplTitle.trim()
    if (!cleanTitle) return
    setSavingTemplate(true)
    try {
      await api.post("/rehab-plans/templates", {
        title: cleanTitle,
        ...(tplGoal.trim() ? { goal: tplGoal.trim() } : {}),
        durationWeeks: Math.max(1, Number(tplWeeks) || 4),
        sessions: [
          {
            name: tplPhaseName.trim() || "Fase 1",
            exercises: [
              {
                name: tplExerciseName.trim() || "Cinesioterapia",
                category: "KINESIOTHERAPY",
              },
            ],
          },
        ],
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.physioTemplates(sub),
      })
      toast.success("Modelo próprio criado.")
      setNewTemplateOpen(false)
      setTplTitle("")
      setTplGoal("")
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        setDenied(true)
        return
      }
      toast.error("Não foi possível salvar o modelo de protocolo.")
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/rehab-plans/${id}`)
      setConfirmDeleteId(null)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.physioTemplates(sub),
      })
      toast.success("Modelo removido.")
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        setDenied(true)
        return
      }
      toast.error("Não foi possível excluir o modelo.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
            Fisioterapia · Protocolos clínicos e reutilização
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
            <Layers className="h-6 w-6 text-[var(--sm-brand)]" />
            Modelos de Protocolo & Catálogo SafeMove
          </h1>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Explore protocolos curados por patologia ou seus próprios modelos em fases e aplique diretamente a um paciente ativo.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setNewTemplateOpen(true)}
          className="min-h-11"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo modelo próprio
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--sm-muted)]" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por patologia, região ou título..."
          aria-label="Filtrar protocolos e modelos"
          className="min-h-11 pl-9"
        />
      </div>

      <Tabs defaultValue="curated">
        <TabsList>
          <TabsTrigger value="curated">
            Protocolos clínicos SafeMove ({filteredCurated.length})
          </TabsTrigger>
          <TabsTrigger value="mine">
            Meus modelos ({filteredTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="mt-4">
          {catalogQuery.isPending ? (
            <AsyncState
              kind="loading"
              title="Carregando protocolos clínicos..."
              description="Buscando catálogo estruturado SafeMove."
            />
          ) : filteredCurated.length === 0 ? (
            <AsyncState
              kind="empty"
              title="Nenhum protocolo encontrado"
              description="Limpe o filtro de busca para visualizar os protocolos clínicos disponíveis."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredCurated.map((protocol) => (
                <article
                  key={protocol.id}
                  className="flex flex-col justify-between gap-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{protocol.conditionArea}</Badge>
                      <Badge variant="outline">
                        {protocol.durationWeeks} semanas ·{" "}
                        {protocol.sessions.length} fases
                      </Badge>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                        {protocol.title}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--sm-muted)]">
                        {protocol.goal}
                      </p>
                    </div>

                    <ul className="space-y-1.5 text-xs text-[var(--sm-ink)]">
                      {protocol.sessions.map((phase, idx) => (
                        <li
                          key={idx}
                          className="rounded-[var(--sm-radius-sm)] bg-[var(--sm-canvas)] px-3 py-2"
                        >
                          <p className="font-semibold">
                            {phase.name} ({phase.estimatedWeeks} sem.)
                          </p>
                          <p className="text-[var(--sm-muted)]">
                            Progressão: {phase.progressionCriteria}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {phase.exercises.slice(0, 3).map((ex, eIdx) => (
                              <Badge key={eIdx} variant="secondary" className="text-[10px]">
                                {ex.name}
                                {ex.category
                                  ? ` · ${REHAB_ITEM_CATEGORY_LABELS[ex.category]}`
                                  : ""}
                              </Badge>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={activeClients.length === 0}
                      onClick={() =>
                        openApplyModal({ kind: "curated", data: protocol })
                      }
                      className="min-h-10"
                    >
                      <UserCheck className="mr-1.5 h-4 w-4" />
                      Aplicar em paciente
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {templatesQuery.isPending ? (
            <AsyncState
              kind="loading"
              title="Carregando seus modelos..."
              description="Consultando protocolos salvos na sua conta."
            />
          ) : filteredTemplates.length === 0 ? (
            <AsyncState
              kind="empty"
              title="Nenhum modelo próprio salvo"
              description="Crie um modelo do zero ou salve o protocolo de um paciente como modelo reutilizável."
              action={
                <Button type="button" onClick={() => setNewTemplateOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo modelo próprio
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTemplates.map((tpl) => (
                <article
                  key={tpl.id}
                  className="flex flex-col justify-between gap-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-[var(--sm-ink)]">
                          {tpl.title}
                        </h2>
                        <p className="text-sm text-[var(--sm-muted)]">
                          {tpl.goal || "Sem objetivo resumido"}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {tpl.sessions.length}{" "}
                        {tpl.sessions.length === 1 ? "fase" : "fases"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {confirmDeleteId === tpl.id ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === tpl.id}
                        onClick={() => void handleDeleteTemplate(tpl.id)}
                      >
                        Confirmar exclusão do modelo
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(tpl.id)}
                        className="text-rose-700"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Excluir
                      </Button>
                    )}

                    <Button
                      type="button"
                      disabled={activeClients.length === 0}
                      onClick={() =>
                        openApplyModal({ kind: "template", data: tpl })
                      }
                      className="min-h-10"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Aplicar em paciente
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(applySource)}
        onOpenChange={(open) => {
          if (!open) setApplySource(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Aplicar protocolo em paciente</DialogTitle>
          <DialogDescription>
            O protocolo selecionado será copiado para o prontuário do paciente escolhido como plano ativo.
          </DialogDescription>
          <form onSubmit={handleApplyProtocol} className="mt-2 space-y-4">
            <div>
              <Label htmlFor="apply-protocol-client">Paciente ativo *</Label>
              <select
                id="apply-protocol-client"
                value={targetClientId}
                onChange={(e) => setTargetClientId(e.target.value)}
                required
                className="mt-1 min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm"
              >
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="apply-protocol-title">Título do protocolo *</Label>
              <Input
                id="apply-protocol-title"
                value={applyTitle}
                onChange={(e) => setApplyTitle(e.target.value)}
                required
                className="mt-1 min-h-11"
              />
            </div>
            <div>
              <Label htmlFor="apply-protocol-goal">Objetivo clínico</Label>
              <Input
                id="apply-protocol-goal"
                value={applyGoal}
                onChange={(e) => setApplyGoal(e.target.value)}
                className="mt-1 min-h-11"
              />
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              {targetClientId ? (
                <Link
                  href={`/clientes/${targetClientId}/nova-reabilitacao`}
                  className="inline-flex min-h-11 items-center text-xs font-bold text-[var(--sm-brand)] hover:underline"
                >
                  Abrir editor completo
                </Link>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setApplySource(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={applying || !targetClientId}>
                  {applying ? "Aplicando..." : "Confirmar e aplicar"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Novo modelo de protocolo</DialogTitle>
          <DialogDescription>
            Crie um modelo base para reutilizar em novos pacientes de fisioterapia.
          </DialogDescription>
          <form onSubmit={handleCreateTemplate} className="mt-2 space-y-4">
            <div>
              <Label htmlFor="new-tpl-title">Título do modelo *</Label>
              <Input
                id="new-tpl-title"
                value={tplTitle}
                onChange={(e) => setTplTitle(e.target.value)}
                placeholder="Ex: Reabilitação de Manguito Rotador"
                required
                className="mt-1 min-h-11"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-tpl-goal">Objetivo</Label>
                <Input
                  id="new-tpl-goal"
                  value={tplGoal}
                  onChange={(e) => setTplGoal(e.target.value)}
                  placeholder="Controle álgico e ganho de ADM"
                  className="mt-1 min-h-11"
                />
              </div>
              <div>
                <Label htmlFor="new-tpl-weeks">Duração (semanas)</Label>
                <Input
                  id="new-tpl-weeks"
                  type="number"
                  min={1}
                  max={104}
                  value={tplWeeks}
                  onChange={(e) => setTplWeeks(e.target.value)}
                  className="mt-1 min-h-11"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-tpl-phase">Nome da primeira fase</Label>
              <Input
                id="new-tpl-phase"
                value={tplPhaseName}
                onChange={(e) => setTplPhaseName(e.target.value)}
                className="mt-1 min-h-11"
              />
            </div>
            <div>
              <Label htmlFor="new-tpl-exercise">Conduta / exercício inicial</Label>
              <Input
                id="new-tpl-exercise"
                value={tplExerciseName}
                onChange={(e) => setTplExerciseName(e.target.value)}
                className="mt-1 min-h-11"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewTemplateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingTemplate}>
                {savingTemplate ? "Salvando..." : "Salvar modelo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
