"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { AssessmentModal } from "@/components/AssessmentModal"
import { api } from "@/lib/api"
import { Activity, Plus, Search, TrendingUp, ArrowRight, X, Scale } from "lucide-react"
import { useRouter } from "next/navigation"
import { useClients } from "@/hooks/features/useClients"

type AssessmentListItem = {
  id: string
  clientId: string | null
  userId: string | null
  date: string
  weight: number | null
  bodyFat: number | null
  client: { id: string; name: string } | null
}

export default function AvaliacoesHubPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const clientsQuery = useClients("ACTIVE")
  const clients = clientsQuery.data ?? []
  const [loadingAssessments, setLoadingAssessments] = useState(true)
  const [assessmentsError, setAssessmentsError] = useState(false)
  
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchDashboardData = useCallback(async () => {
    setLoadingAssessments(true)
    setAssessmentsError(false)
    try {
      const assessmentsRes = await api.get<AssessmentListItem[]>("/assessments")
      setAssessments(assessmentsRes.data || [])
    } catch {
      setAssessments([])
      setAssessmentsError(true)
    } finally {
      setLoadingAssessments(false)
    }
  }, [])

  useEffect(() => {
    void fetchDashboardData()
  }, [fetchDashboardData])

  const loading = clientsQuery.isPending || loadingAssessments

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectClient = (clientId: string) => {
    setShowSelectModal(false)
    setSelectedClientId(clientId)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-500" /> Central de Avaliações
            </h1>
            <p className="text-slate-500 mt-1">
              Acompanhe a evolução da composição corporal e antropometria dos seus clientes.
            </p>
          </div>

          <Button 
            onClick={() => setShowSelectModal(true)}
            className="h-12 px-6 shadow-md text-base text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Avaliação
          </Button>
        </div>

        {/* RESUMO RÁPIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-0 border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" /> Total de Medições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-800">{assessments.length}</div>
              <p className="text-sm text-indigo-600 font-medium mt-1">Registos no sistema</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-500" /> Ação Rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 font-medium mt-1 mb-3">O cliente já chegou ao consultório?</p>
              <Button onClick={() => setShowSelectModal(true)} variant="outline" className="w-full border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                Selecionar Cliente para Medir
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE AVALIAÇÕES RECENTES */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-indigo-50 border-b border-indigo-100">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-800">
              <TrendingUp className="w-5 h-5" /> Últimas Avaliações Registadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="py-4 px-6">Cliente</TableHead>
                    <TableHead className="px-6">Data da Medição</TableHead>
                    <TableHead className="px-6">Peso Registado</TableHead>
                    <TableHead className="px-6">% Gordura</TableHead>
                    <TableHead className="text-right px-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500 animate-pulse">
                        A carregar histórico...
                      </TableCell>
                    </TableRow>
                  ) : assessmentsError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-rose-600">
                        Não foi possível carregar o histórico de avaliações.
                      </TableCell>
                    </TableRow>
                  ) : assessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                        <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        Nenhuma avaliação encontrada no histórico.<br/>
                        Clique em "Nova Avaliação" para inserir as primeiras medidas!
                      </TableCell>
                    </TableRow>
                  ) : (
                    assessments.map((assessment) => (
                      <TableRow key={assessment.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-semibold text-slate-700 py-4 px-6">
                          {assessment.client?.name || "Cliente indisponível"}
                        </TableCell>
                        <TableCell className="text-slate-500 px-6">
                          {new Date(assessment.date).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell className="text-slate-700 font-bold px-6">
                          {assessment.weight ?? '-'}{assessment.weight !== null ? ' kg' : ''}
                        </TableCell>
                        <TableCell className="text-slate-500 px-6">
                          {assessment.bodyFat !== null ? `${assessment.bodyFat}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => assessment.clientId && router.push(`/clientes/${assessment.clientId}`)}
                            disabled={!assessment.clientId}
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          >
                            <Activity className="w-4 h-4 mr-1" /> Ver Gráficos
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seleção do cliente para a avaliação */}
      {showSelectModal && (
        <>
          <div aria-hidden="true" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowSelectModal(false)}></div>
          <div role="dialog" aria-modal="true" aria-labelledby="assessment-client-picker-title" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 id="assessment-client-picker-title" className="text-lg font-bold text-slate-800">Quem vamos avaliar hoje?</h2>
                <p className="text-sm text-slate-500">Selecione um cliente da sua base privada.</p>
              </div>
              <Button aria-label="Fechar seleção de cliente" variant="ghost" size="icon" onClick={() => setShowSelectModal(false)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  aria-label="Buscar cliente pelo nome"
                  placeholder="Buscar pelo nome..." 
                  className="pl-10 h-12 bg-slate-50 focus-visible:ring-indigo-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-2 mt-4">
                {clientsQuery.isError ? (
                  <p className="text-center text-rose-600 py-4">Não foi possível carregar seus clientes.</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Nenhum cliente encontrado.</p>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      className="flex w-full items-center justify-between p-3 text-left rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all group"
                    >
                      <div>
                        <p className="font-bold text-slate-700 group-hover:text-indigo-800">{client.name}</p>
                        <p className="text-xs text-slate-400">Peso inicial: {client.initialWeight ?? '--'} kg</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <AssessmentModal
        isOpen={Boolean(selectedClientId)}
        clientId={selectedClientId ?? ""}
        onClose={() => setSelectedClientId(null)}
        onSuccess={() => void fetchDashboardData()}
      />

    </div>
  )
}
