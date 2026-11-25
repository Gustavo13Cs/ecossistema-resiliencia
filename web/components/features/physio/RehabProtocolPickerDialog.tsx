"use client"

import { useMemo, useState } from "react"
import { BookOpen, CheckCircle2, Layers } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CuratedRehabProtocol, RehabPlan } from "@/hooks/features/useFisio"
import {
  usePhysioProtocolCatalog,
  usePhysioTemplates,
} from "@/hooks/features/useRehabCatalog"

export interface RehabProtocolPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelectProtocol: (protocol: CuratedRehabProtocol | RehabPlan) => void
}

export function RehabProtocolPickerDialog({
  open,
  onClose,
  onSelectProtocol,
}: RehabProtocolPickerDialogProps) {
  const [search, setSearch] = useState("")
  const catalogQuery = usePhysioProtocolCatalog(open)
  const templatesQuery = usePhysioTemplates(open)

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase()
    const items = catalogQuery.data ?? []
    if (!q) return items
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.conditionArea.toLowerCase().includes(q) ||
        item.goal.toLowerCase().includes(q),
    )
  }, [catalogQuery.data, search])

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase()
    const items = templatesQuery.data ?? []
    if (!q) return items
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.goal ?? "").toLowerCase().includes(q),
    )
  }, [templatesQuery.data, search])

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          Protocolos Prontos & Modelos
        </DialogTitle>
        <DialogDescription>
          Importe um protocolo clínico base ou um modelo salvo por você para acelerar a prescrição. Os campos podem ser ajustados livremente após importar.
        </DialogDescription>

        <div className="space-y-4 pt-2">
          <Input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Filtrar por diagnóstico ou região (ex: LCA, Lombar, Ombro, Tornozelo)..."
            aria-label="Filtrar protocolos"
            className="min-h-11"
          />

          <Tabs defaultValue="curated">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="curated">
                Protocolos Prontos SafeMove
              </TabsTrigger>
              <TabsTrigger value="mine">
                Meus Modelos ({templatesQuery.data?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curated" className="mt-4 space-y-3">
              {catalogQuery.isPending ? (
                <AsyncState
                  kind="loading"
                  title="Carregando protocolos clínicos"
                  description="Buscando os protocolos base do SafeMove."
                />
              ) : catalogQuery.isError ? (
                <AsyncState
                  kind="error"
                  title="Não foi possível carregar os protocolos"
                  description="Tente novamente para consultar os protocolos prontos."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void catalogQuery.refetch()}
                    >
                      Tentar novamente
                    </Button>
                  }
                />
              ) : filteredCatalog.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--sm-muted)]">
                  Nenhum protocolo encontrado para &ldquo;{search}&rdquo;.
                </p>
              ) : (
                <div className="grid gap-3">
                  {filteredCatalog.map(protocol => {
                    const homeCount = protocol.sessions.reduce(
                      (acc, s) =>
                        acc + s.exercises.filter(ex => ex.isHomeExercise).length,
                      0,
                    )
                    return (
                      <article
                        key={protocol.id}
                        className="space-y-2.5 rounded-lg border border-[var(--sm-border)] bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {protocol.conditionArea}
                              </Badge>
                              <Badge variant="outline">
                                {protocol.durationWeeks} semanas
                              </Badge>
                              <Badge variant="outline">
                                {protocol.sessions.length} fases
                              </Badge>
                              {homeCount > 0 ? (
                                <Badge variant="outline">
                                  {homeCount} para casa
                                </Badge>
                              ) : null}
                            </div>
                            <h3 className="text-base font-bold text-slate-900">
                              {protocol.title}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {protocol.goal}
                            </p>
                          </div>
                          <Button
                            type="button"
                            className="min-h-11 shrink-0"
                            onClick={() => {
                              onSelectProtocol(protocol)
                              onClose()
                            }}
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Usar protocolo
                          </Button>
                        </div>

                        <div className="space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                          {protocol.sessions.map((session, idx) => (
                            <p key={idx}>
                              <strong className="text-slate-800">
                                {session.name}:
                              </strong>{" "}
                              {session.progressionCriteria}
                            </p>
                          ))}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="mine" className="mt-4 space-y-3">
              {templatesQuery.isPending ? (
                <AsyncState
                  kind="loading"
                  title="Carregando seus modelos"
                  description="Consultando seus modelos salvos de reabilitação."
                />
              ) : templatesQuery.isError ? (
                <AsyncState
                  kind="error"
                  title="Não foi possível carregar seus modelos"
                  description="Tente novamente em instantes."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void templatesQuery.refetch()}
                    >
                      Tentar novamente
                    </Button>
                  }
                />
              ) : filteredTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  <Layers className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  Você ainda não possui modelos próprios salvos. Use &ldquo;Salvar como modelo&rdquo; ao montar ou consultar um protocolo.
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredTemplates.map(template => (
                    <article
                      key={template.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--sm-border)] bg-white p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Modelo próprio</Badge>
                          {template.durationWeeks != null ? (
                            <Badge variant="outline">
                              {template.durationWeeks} semanas
                            </Badge>
                          ) : null}
                          <Badge variant="outline">
                            {template.sessions.length} fases
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {template.title}
                        </h3>
                        {template.goal ? (
                          <p className="text-sm text-slate-600">{template.goal}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        className="min-h-11 shrink-0"
                        onClick={() => {
                          onSelectProtocol(template)
                          onClose()
                        }}
                      >
                        Aplicar modelo
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
