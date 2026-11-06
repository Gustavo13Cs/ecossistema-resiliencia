"use client"

import { useEffect, useRef, useState } from "react"
import { isAxiosError } from "axios"
import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  Pencil,
  Plus,
  Search,
  UserPlus,
} from "lucide-react"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import {
  useWorkoutTemplateHubMutations,
  useWorkoutTemplates,
} from "@/hooks/features/useWorkoutTemplates"
import {
  TRAINING_ENVIRONMENT_LABELS,
  type TrainingEnvironment,
} from "@/types/training-anamnesis"
import {
  TEMPLATE_GOAL_LABELS,
  TEMPLATE_LEVEL_LABELS,
  type TemplateGoal,
  type TemplateLevel,
  type WorkoutTemplateDetail,
  type WorkoutTemplateFilters,
  type WorkoutTemplateSummary,
} from "@/types/workout-template"
import { ApplyWorkoutTemplateDialog } from "./ApplyWorkoutTemplateDialog"
import { WorkoutTemplateFormDialog } from "./WorkoutTemplateFormDialog"
import { WorkoutTemplateParameters } from "./WorkoutTemplatePicker"

type HubTab = "active-all" | "private" | "global" | "archived"

const TAB_CONFIG: ReadonlyArray<{
  id: HubTab
  label: string
  origin: NonNullable<WorkoutTemplateFilters["origin"]>
  status: NonNullable<WorkoutTemplateFilters["status"]>
}> = [
  { id: "active-all", label: "Todos ativos", origin: "all", status: "active" },
  { id: "private", label: "Meus modelos", origin: "private", status: "active" },
  { id: "global", label: "SafeMove", origin: "global", status: "active" },
  { id: "archived", label: "Arquivados", origin: "private", status: "archived" },
]

const selectClass =
  "min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"

export function WorkoutTemplatesHub() {
  const { user } = useAuth()
  if (!user?.sub || user.role !== "PERSONAL") {
    return (
      <div role="alert" className="space-y-2 p-6">
        <h1 className="text-xl font-bold">Área de treinamento indisponível</h1>
        <p className="text-sm text-[var(--sm-muted)]">
          Esta área é exclusiva para profissionais de Educação Física.
        </p>
      </div>
    )
  }
  return <TemplatesHubSession key={user.sub} />
}

function TemplatesHubSession() {
  const [activeTab, setActiveTab] = useState<HubTab>("active-all")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [goalFilter, setGoalFilter] = useState<TemplateGoal | "">("")
  const [levelFilter, setLevelFilter] = useState<TemplateLevel | "">("")
  const [environmentFilter, setEnvironmentFilter] = useState<
    TrainingEnvironment | ""
  >("")
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const [previewId, setPreviewId] = useState<string | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<WorkoutTemplateDetail | null>(null)
  const [applyingTemplate, setApplyingTemplate] =
    useState<WorkoutTemplateSummary | null>(null)

  const [statusBanner, setStatusBanner] = useState<{
    kind: "info" | "error"
    text: string
    duplicatedTemplate?: WorkoutTemplateDetail
  } | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
      setCursor(undefined)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const currentTabConfig =
    TAB_CONFIG.find(tab => tab.id === activeTab) ?? TAB_CONFIG[0]

  const filters: WorkoutTemplateFilters = {
    origin: currentTabConfig.origin,
    status: currentTabConfig.status,
    ...(goalFilter ? { goal: goalFilter } : {}),
    ...(levelFilter ? { level: levelFilter } : {}),
    ...(environmentFilter ? { environment: environmentFilter } : {}),
    ...(debouncedQuery ? { q: debouncedQuery } : {}),
  }

  const list = useWorkoutTemplates({ filters, cursor })
  const preview = useWorkoutTemplates({
    templateId: previewId,
    enabled: Boolean(previewId),
  })
  const hubMutations = useWorkoutTemplateHubMutations()

  const accessDenied =
    denied ||
    list.accessDenied ||
    preview.accessDenied ||
    hubMutations.accessDenied

  if (accessDenied) {
    return (
      <AsyncState
        kind="error"
        title="Restabeleça seu acesso"
        description="Sua sessão não permite acessar os modelos de treino. Entre novamente para continuar."
        action={<ReauthenticateButton />}
      />
    )
  }

  const actionBusy =
    Boolean(loadingEditId) ||
    hubMutations.duplicateTemplateMutation.isPending ||
    hubMutations.archiveTemplateMutation.isPending ||
    hubMutations.restoreTemplateMutation.isPending

  const switchTab = (nextTab: HubTab) => {
    setActiveTab(nextTab)
    setCursor(undefined)
    setStatusBanner(null)
  }

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const delta = event.key === "ArrowRight" ? 1 : -1
    const nextIndex = (index + delta + TAB_CONFIG.length) % TAB_CONFIG.length
    const nextTab = TAB_CONFIG[nextIndex]
    switchTab(nextTab.id)
    tabRefs.current[nextIndex]?.focus()
  }

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setStatusBanner(null)
    setFormOpen(true)
  }

  const handleOpenEdit = async (templateId: string) => {
    setLoadingEditId(templateId)
    setStatusBanner(null)
    try {
      const detail = await hubMutations.loadTemplateDetail(templateId)
      setEditingTemplate(detail)
      setFormOpen(true)
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        setDenied(true)
        return
      }
      setStatusBanner({
        kind: "error",
        text: "Não foi possível carregar os detalhes do modelo para edição.",
      })
    } finally {
      setLoadingEditId(null)
    }
  }

  const handleDuplicate = async (item: WorkoutTemplateSummary) => {
    setStatusBanner(null)
    try {
      const duplicated = await hubMutations.duplicateTemplateMutation.mutateAsync(
        { templateId: item.id },
      )
      setStatusBanner({
        kind: "info",
        text: `Cópia privada criada: "${duplicated.title}".`,
        duplicatedTemplate: duplicated,
      })
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        setDenied(true)
        return
      }
      setStatusBanner({
        kind: "error",
        text: "Não foi possível duplicar o modelo selecionado.",
      })
    }
  }

  const handleArchiveToggle = async (item: WorkoutTemplateSummary) => {
    setStatusBanner(null)
    try {
      if (item.archivedAt) {
        await hubMutations.restoreTemplateMutation.mutateAsync(item.id)
        setStatusBanner({
          kind: "info",
          text: `Modelo "${item.title}" restaurado para Meus modelos.`,
        })
      } else {
        await hubMutations.archiveTemplateMutation.mutateAsync(item.id)
        setStatusBanner({
          kind: "info",
          text: `Modelo "${item.title}" movido para Arquivados.`,
        })
      }
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        setDenied(true)
        return
      }
      setStatusBanner({
        kind: "error",
        text: "Não foi possível atualizar o status do modelo.",
      })
    }
  }

  const items = list.listQuery.data?.items ?? []
  const nextCursor = list.listQuery.data?.nextCursor ?? null

  return (
    <div className="min-w-0 space-y-6 pb-10 text-[var(--sm-ink)]">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--sm-brand)]">
            Treinamento
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
            Modelos de treino
          </h1>
          <p className="mt-2 max-w-[68ch] text-base text-[var(--sm-muted)]">
            Construa sua biblioteca metodológica privada, personalize bases
            SafeMove e aplique estruturas completas em rascunhos de alunos.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0 gap-2"
          onClick={handleOpenCreate}
        >
          <Plus className="size-4" aria-hidden="true" />
          Novo modelo
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Categorias de modelos de treino"
        className="flex flex-wrap gap-2 border-b border-[var(--sm-border)] pb-3"
      >
        {TAB_CONFIG.map((tab, index) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              ref={el => {
                tabRefs.current[index] = el
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => switchTab(tab.id)}
              onKeyDown={event => handleTabKeyDown(event, index)}
              className={`min-h-11 rounded-[var(--sm-radius-sm)] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)] ${
                selected
                  ? "bg-[var(--sm-brand)] text-white"
                  : "border border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {statusBanner ? (
        <div
          role={statusBanner.kind === "error" ? "alert" : "status"}
          aria-live={statusBanner.kind === "error" ? "assertive" : "polite"}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--sm-radius-sm)] border p-3.5 text-sm ${
            statusBanner.kind === "error"
              ? "border-[var(--sm-danger)] bg-[var(--sm-surface)] text-[var(--sm-danger)]"
              : "border-[var(--sm-border)] bg-[var(--sm-surface)] text-[var(--sm-ink)]"
          }`}
        >
          <span>{statusBanner.text}</span>
          {statusBanner.duplicatedTemplate ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-xs"
              onClick={() => {
                setEditingTemplate(statusBanner.duplicatedTemplate ?? null)
                setFormOpen(true)
              }}
            >
              Editar cópia agora
            </Button>
          ) : null}
        </div>
      ) : null}

      <section
        role="search"
        aria-label="Filtrar modelos de treino"
        className="space-y-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
      >
        <div className="space-y-2">
          <Label
            htmlFor="hub-template-search"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Search className="size-4" aria-hidden="true" />
            Buscar modelo por nome ou descrição
          </Label>
          <Input
            id="hub-template-search"
            type="search"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder="Ex.: hipertrofia, upper lower, condomínio, full body..."
            className="min-h-11"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="hub-filter-goal" className="text-sm font-semibold">
              Objetivo
            </Label>
            <select
              id="hub-filter-goal"
              value={goalFilter}
              onChange={event => {
                setGoalFilter(event.target.value as TemplateGoal | "")
                setCursor(undefined)
              }}
              className={selectClass}
            >
              <option value="">Todos os objetivos</option>
              {Object.entries(TEMPLATE_GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hub-filter-level" className="text-sm font-semibold">
              Nível
            </Label>
            <select
              id="hub-filter-level"
              value={levelFilter}
              onChange={event => {
                setLevelFilter(event.target.value as TemplateLevel | "")
                setCursor(undefined)
              }}
              className={selectClass}
            >
              <option value="">Todos os níveis</option>
              {Object.entries(TEMPLATE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="hub-filter-environment"
              className="text-sm font-semibold"
            >
              Ambiente de treino
            </Label>
            <select
              id="hub-filter-environment"
              value={environmentFilter}
              onChange={event => {
                setEnvironmentFilter(
                  event.target.value as TrainingEnvironment | "",
                )
                setCursor(undefined)
              }}
              className={selectClass}
            >
              <option value="">Todos os ambientes</option>
              {Object.entries(TRAINING_ENVIRONMENT_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      </section>

      <section aria-label="Lista de modelos de treino" className="space-y-4">
        {list.listQuery.isPending ? (
          <p role="status" className="text-sm text-[var(--sm-muted)]">
            Carregando modelos de treino...
          </p>
        ) : list.listQuery.error ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-[var(--sm-danger)]">
              Não foi possível consultar os modelos de treino.
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => void list.listQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6">
            <p className="text-sm text-[var(--sm-muted)]">
              Nenhum modelo encontrado para os filtros selecionados.
            </p>
            {activeTab !== "archived" ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={handleOpenCreate}
              >
                Criar meu primeiro modelo privado
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="grid gap-4 md:grid-cols-2">
              {items.map(item => (
                <li
                  key={item.id}
                  className="flex min-w-0 flex-col justify-between gap-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                        {item.isGlobal
                          ? "SafeMove · Global"
                          : item.archivedAt
                            ? "Meu modelo · Arquivado"
                            : "Meu modelo · Editável"}
                      </span>
                      {item.estimatedWeeks != null ? (
                        <span className="text-xs font-semibold text-[var(--sm-muted)] tabular-nums">
                          {item.estimatedWeeks} semanas
                        </span>
                      ) : null}
                    </div>

                    <h2 className="break-words text-lg font-bold">
                      {item.title}
                    </h2>

                    <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                      <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5">
                        {TEMPLATE_GOAL_LABELS[item.goal]}
                      </span>
                      <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5">
                        {TEMPLATE_LEVEL_LABELS[item.level]}
                      </span>
                      {item.environment ? (
                        <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5 text-[var(--sm-brand)]">
                          {TRAINING_ENVIRONMENT_LABELS[item.environment]}
                        </span>
                      ) : null}
                    </div>

                    {item.targetAudience ? (
                      <p className="text-xs text-[var(--sm-muted)]">
                        <span className="font-semibold">Público-alvo: </span>
                        {item.targetAudience}
                      </p>
                    ) : null}

                    {item.description ? (
                      <p className="line-clamp-3 break-words text-sm text-[var(--sm-muted)]">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sm-border)] pt-3">
                    {!item.archivedAt ? (
                      <Button
                        type="button"
                        className="min-h-10 gap-1.5 px-3 text-xs"
                        aria-label={`Aplicar em aluno: ${item.title}`}
                        disabled={actionBusy}
                        onClick={() => setApplyingTemplate(item)}
                      >
                        <UserPlus className="size-3.5" aria-hidden="true" />
                        Aplicar em aluno
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10 gap-1.5 px-3 text-xs"
                      aria-label={`Pré-visualizar ${item.title}`}
                      disabled={actionBusy}
                      onClick={() => setPreviewId(item.id)}
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                      Pré-visualizar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10 gap-1.5 px-3 text-xs"
                      aria-label={
                        item.isGlobal
                          ? `Criar minha versão de ${item.title}`
                          : `Duplicar ${item.title}`
                      }
                      disabled={actionBusy}
                      onClick={() => void handleDuplicate(item)}
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                      {item.isGlobal ? "Criar minha versão" : "Duplicar"}
                    </Button>

                    {!item.isGlobal ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10 gap-1.5 px-3 text-xs"
                          aria-label={`Editar ${item.title}`}
                          disabled={actionBusy}
                          onClick={() => void handleOpenEdit(item.id)}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          {loadingEditId === item.id ? "Abrindo..." : "Editar"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10 gap-1.5 px-3 text-xs"
                          aria-label={
                            item.archivedAt
                              ? `Restaurar ${item.title}`
                              : `Arquivar ${item.title}`
                          }
                          disabled={actionBusy}
                          onClick={() => void handleArchiveToggle(item)}
                        >
                          {item.archivedAt ? (
                            <>
                              <ArchiveRestore
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Restaurar
                            </>
                          ) : (
                            <>
                              <Archive className="size-3.5" aria-hidden="true" />
                              Arquivar
                            </>
                          )}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {cursor ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setCursor(undefined)}
                >
                  Primeira página
                </Button>
              ) : null}
              {nextCursor ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setCursor(nextCursor)}
                >
                  Próxima página
                </Button>
              ) : null}
            </div>
          </>
        )}
      </section>

      <Dialog
        open={Boolean(previewId)}
        onOpenChange={nextOpen => {
          if (!nextOpen) setPreviewId(undefined)
        }}
      >
        <DialogContent
          overlayClassName="print:hidden"
          className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl print:hidden"
        >
          <DialogHeader>
            <DialogTitle>
              {preview.detailQuery.data?.title ?? "Estrutura do modelo"}
            </DialogTitle>
            <DialogDescription>
              {preview.detailQuery.data?.isGlobal
                ? "Modelo base SafeMove (somente leitura). Crie sua versão privada para personalizar divisões e exercícios."
                : "Modelo privado da sua biblioteca profissional."}
            </DialogDescription>
          </DialogHeader>

          {preview.detailQuery.isPending ? (
            <p role="status" className="py-6 text-sm text-[var(--sm-muted)]">
              Carregando estrutura do modelo...
            </p>
          ) : preview.detailQuery.error ? (
            <div role="alert" className="space-y-2 text-sm text-[var(--sm-danger)]">
              <p>Não foi possível carregar os parâmetros deste modelo.</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-10 text-xs"
                onClick={() => void preview.detailQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : preview.detailQuery.data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5">
                  {TEMPLATE_GOAL_LABELS[preview.detailQuery.data.goal]}
                </span>
                <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5">
                  {TEMPLATE_LEVEL_LABELS[preview.detailQuery.data.level]}
                </span>
                {preview.detailQuery.data.environment ? (
                  <span className="rounded-full border border-[var(--sm-border)] px-2.5 py-0.5 text-[var(--sm-brand)]">
                    {
                      TRAINING_ENVIRONMENT_LABELS[
                        preview.detailQuery.data.environment
                      ]
                    }
                  </span>
                ) : null}
              </div>
              {preview.detailQuery.data.description ? (
                <p className="text-sm text-[var(--sm-muted)]">
                  {preview.detailQuery.data.description}
                </p>
              ) : null}
              {preview.detailQuery.data.targetAudience ? (
                <p className="text-xs text-[var(--sm-muted)]">
                  <span className="font-semibold">Público-alvo: </span>
                  {preview.detailQuery.data.targetAudience}
                </p>
              ) : null}
              <WorkoutTemplateParameters
                content={preview.detailQuery.data.content}
              />
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            {preview.detailQuery.data &&
            !preview.detailQuery.data.archivedAt ? (
              <Button
                type="button"
                className="min-h-11"
                onClick={() => {
                  const target = preview.detailQuery.data!
                  setPreviewId(undefined)
                  setApplyingTemplate(target)
                }}
              >
                Aplicar em aluno
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setPreviewId(undefined)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkoutTemplateFormDialog
        open={formOpen}
        initialTemplate={editingTemplate}
        onClose={() => {
          setFormOpen(false)
          setEditingTemplate(null)
        }}
        onSuccess={saved => {
          setFormOpen(false)
          setEditingTemplate(null)
          setStatusBanner({
            kind: "info",
            text: editingTemplate
              ? `Modelo "${saved.title}" atualizado com sucesso.`
              : `Modelo "${saved.title}" criado na sua biblioteca privada.`,
          })
        }}
        onAccessDenied={() => {
          setFormOpen(false)
          setDenied(true)
        }}
      />

      <ApplyWorkoutTemplateDialog
        open={Boolean(applyingTemplate)}
        template={applyingTemplate}
        onClose={() => setApplyingTemplate(null)}
        onAccessDenied={() => {
          setApplyingTemplate(null)
          setDenied(true)
        }}
      />
    </div>
  )
}
