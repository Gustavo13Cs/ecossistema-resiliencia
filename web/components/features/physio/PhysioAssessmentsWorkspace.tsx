"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import {
  Activity,
  ClipboardCheck,
  Plus,
  Search,
  Stethoscope,
} from "lucide-react"
import { PhysioAssessmentModal } from "@/components/PhysioAssessmentModal"
import { ReauthenticateButton } from "@/components/auth/ReauthenticateButton"
import { AsyncState } from "@/components/feedback/AsyncState"
import { PhysioFunctionalScaleDialog } from "@/components/features/physio/PhysioFunctionalScaleDialog"
import { PhysioFunctionalScalesSection } from "@/components/features/physio/PhysioFunctionalScalesSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { useClinicalQuery } from "@/hooks/features/useClinicalQuery"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { PhysioAssessmentRecord } from "@/types/physio"

type PhysioAssessmentWithClient = PhysioAssessmentRecord & {
  client?: { id: string; name: string } | null
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date)
}

export function PhysioAssessmentsWorkspace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isPhysio = Boolean(user?.sub && user.role === "PHYSIO")
  const sub = user?.sub ?? "anonymous"

  const clientsQuery = useClients("ACTIVE", { enabled: isPhysio })
  const assessmentsQuery = useClinicalQuery(
    ["physio-assessments-all", sub] as const,
    isPhysio,
    async (signal) => {
      const { data } = await api.get<PhysioAssessmentWithClient[]>(
        "/physio-assessments",
        { signal },
      )
      return data ?? []
    },
  )

  const [search, setSearch] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [modalClientId, setModalClientId] = useState<string | null>(null)
  const [scaleClientId, setScaleClientId] = useState<string>("")
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false)
  const [denied, setDenied] = useState(false)

  const activeClients = useMemo(
    () => clientsQuery.data ?? [],
    [clientsQuery.data],
  )
  const effectiveScaleClientId = scaleClientId || activeClients[0]?.id || ""
  const effectiveScaleClient = activeClients.find(
    (c) => c.id === effectiveScaleClientId,
  )

  const filteredAssessments = useMemo(() => {
    const items = assessmentsQuery.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const name = item.client?.name?.toLowerCase() ?? ""
      const complaint = item.chiefComplaint?.toLowerCase() ?? ""
      return name.includes(q) || complaint.includes(q)
    })
  }, [assessmentsQuery.data, search])

  const accessDenied =
    denied ||
    [assessmentsQuery.error, clientsQuery.error].some(
      (err) => isAxiosError(err) && [401, 403].includes(err.response?.status ?? 0),
    )

  if (!isPhysio) return null

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar as avaliações fisioterapêuticas."
          action={<ReauthenticateButton />}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sm-border)] pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sm-brand)]">
            Fisioterapia · Exame físico e funcionalidade
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.025em] text-[var(--sm-ink)] sm:text-3xl">
            <Stethoscope className="h-6 w-6 text-[var(--sm-brand)]" />
            Avaliações Fisioterapêuticas & Escalas
          </h1>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Exame físico estruturado (mapa de dor, goniometria, força MRC, testes especiais) e escalas funcionais validadas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!effectiveScaleClientId}
            onClick={() => setScaleDialogOpen(true)}
            className="min-h-11"
          >
            <ClipboardCheck className="mr-1.5 h-4 w-4" />
            Aplicar escala funcional
          </Button>
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={activeClients.length === 0}
            className="min-h-11"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova avaliação fisioterapêutica
          </Button>
        </div>
      </header>

      <Tabs defaultValue="exams">
        <TabsList>
          <TabsTrigger value="exams">Exames físicos ({assessmentsQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="scales">Escalas funcionais (PSFS, Oswestry, NDI, LEFS, SPADI, TUG)</TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--sm-muted)]" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente ou queixa principal..."
              aria-label="Buscar avaliações fisioterapêuticas"
              className="min-h-11 pl-9"
            />
          </div>

          {assessmentsQuery.isPending ? (
            <AsyncState
              kind="loading"
              title="Carregando avaliações fisioterapêuticas..."
              description="Buscando exames físicos registrados na sua base."
            />
          ) : assessmentsQuery.error ? (
            <AsyncState
              kind="error"
              title="Avaliações indisponíveis"
              description="Não foi possível carregar as avaliações fisioterapêuticas."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void assessmentsQuery.refetch()}
                >
                  Tentar novamente
                </Button>
              }
            />
          ) : filteredAssessments.length === 0 ? (
            <AsyncState
              kind="empty"
              title="Nenhuma avaliação encontrada"
              description={
                assessmentsQuery.data?.length
                  ? "Ajuste a busca para localizar outra avaliação."
                  : "Registre a primeira avaliação fisioterapêutica estruturada de um paciente."
              }
              action={
                activeClients.length > 0 ? (
                  <Button type="button" onClick={() => setPickerOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nova avaliação fisioterapêutica
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredAssessments.map((item) => (
                <article
                  key={item.id}
                  className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/clientes/${item.clientId}`}
                        className="font-bold text-[var(--sm-brand)] hover:underline"
                      >
                        {item.client?.name ?? "Paciente"}
                      </Link>
                      <p className="text-xs text-[var(--sm-muted)]">
                        {formatDate(item.date)}
                      </p>
                    </div>
                    {item.painLevel != null ? (
                      <Badge variant="outline">EVA {item.painLevel}/10</Badge>
                    ) : null}
                  </div>

                  <p className="text-sm text-[var(--sm-ink)]">
                    <span className="font-semibold">Queixa: </span>
                    {item.chiefComplaint || "Não informada"}
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {item.bodyPainMap?.length ? (
                      <Badge variant="secondary">
                        Mapa de dor: {item.bodyPainMap.length}
                      </Badge>
                    ) : null}
                    {item.goniometry?.length ? (
                      <Badge variant="secondary">
                        Goniometria: {item.goniometry.length}
                      </Badge>
                    ) : null}
                    {item.muscleStrength?.length ? (
                      <Badge variant="secondary">
                        Força MRC: {item.muscleStrength.length}
                      </Badge>
                    ) : null}
                    {item.orthopedicTestItems?.length ? (
                      <Badge variant="secondary">
                        Testes: {item.orthopedicTestItems.length}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={`/clientes/${item.clientId}`}
                      className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[var(--sm-brand)] hover:underline"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Abrir prontuário
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scales" className="mt-4 space-y-4">
          {activeClients.length === 0 ? (
            <AsyncState
              kind="empty"
              title="Nenhum paciente ativo"
              description="Cadastre um paciente ativo para aplicar escalas funcionais padronizadas."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
                <div className="min-w-[240px] flex-1">
                  <label
                    htmlFor="physio-scales-client-select"
                    className="block text-xs font-semibold uppercase tracking-wide text-[var(--sm-muted)]"
                  >
                    Paciente selecionado
                  </label>
                  <select
                    id="physio-scales-client-select"
                    value={effectiveScaleClientId}
                    onChange={(e) => setScaleClientId(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)]"
                  >
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Link
                  href={`/clientes/${effectiveScaleClientId}`}
                  className="inline-flex min-h-11 items-center rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"
                >
                  Abrir prontuário
                </Link>
              </div>

              {effectiveScaleClientId ? (
                <PhysioFunctionalScalesSection
                  clientId={effectiveScaleClientId}
                  blocked={false}
                  onOpenDialog={() => setScaleDialogOpen(true)}
                  onAccessDenied={() => setDenied(true)}
                />
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogTitle>Selecionar paciente para avaliação</DialogTitle>
          <DialogDescription>
            Escolha um paciente ativo para abrir o exame físico fisioterapêutico estruturado.
          </DialogDescription>
          <div className="mt-2 space-y-2">
            {activeClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setPickerOpen(false)
                  setModalClientId(client.id)
                }}
                className="flex min-h-11 w-full items-center justify-between rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-3 py-2 text-left text-sm font-semibold hover:bg-[var(--sm-subtle-hover)]"
              >
                <span>{client.name}</span>
                <span className="text-xs font-bold text-[var(--sm-brand)]">
                  Avaliar
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {modalClientId ? (
        <PhysioAssessmentModal
          isOpen={true}
          clientId={modalClientId}
          onClose={() => setModalClientId(null)}
          onSuccess={() => {
            const assessedId = modalClientId
            setModalClientId(null)
            void Promise.all([
              queryClient.invalidateQueries({
                queryKey: ["physio-assessments-all", sub],
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.physioAssessments(sub, assessedId),
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.physioOverview(sub, assessedId),
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.physioWorkspace(sub),
              }),
            ])
          }}
        />
      ) : null}

      {scaleDialogOpen && effectiveScaleClientId ? (
        <PhysioFunctionalScaleDialog
          open={true}
          onOpenChange={setScaleDialogOpen}
          clientId={effectiveScaleClientId}
          clientName={effectiveScaleClient?.name}
          onAccessDenied={() => setDenied(true)}
        />
      ) : null}
    </div>
  )
}
