"use client"

import { Activity, Info, Timer, Repeat, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useFisio } from "@/hooks/features/useFisio"

export default function FisioPacientePage() {
  const { user } = useAuth()
  
  // A Lógica de Negócio importada e tipada
  const { rehabPlan, loading, error } = useFisio(user?.sub)

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Reabilitação</h1>
          <p className="text-slate-500">O seu protocolo de recuperação clínica.</p>
        </div>
      </div>

      {/* FEEDBACK DE ERRO */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-800">Ops, algo correu mal</h3>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">A carregar o seu protocolo...</p>
        </div>
      ) : !rehabPlan && !error ? (
        
        /* ESTADO VAZIO (Sem Protocolo) */
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
           <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
           <p className="text-slate-500 font-medium">Você não possui protocolos de reabilitação ativos.</p>
           <p className="text-sm text-slate-400 mt-1">Fale com a sua Fisioterapeuta.</p>
        </div>
      ) : rehabPlan && (
        
        /* DADOS REAIS */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-md">
            <h2 className="text-2xl font-bold">{rehabPlan.title}</h2>
            <p className="opacity-90 mt-1">{rehabPlan.goal}</p>
            {rehabPlan.notes && (
              <div className="mt-4 p-4 bg-white/10 rounded-xl border border-white/20 text-sm">
                <h4 className="font-bold flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4" /> Orientações Médicas
                </h4>
                <p>{rehabPlan.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {rehabPlan.sessions?.map((session) => (
              <div key={session.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                
                <div className="bg-purple-50 px-5 py-4 border-b border-purple-100 flex justify-between items-center">
                  <h3 className="font-black text-purple-900 text-lg">{session.name}</h3>
                  {session.focus && (
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                      {session.focus}
                    </span>
                  )}
                </div>
                
                <div className="divide-y divide-slate-100">
                  {session.exercises?.map((ex, idx) => (
                    <div key={ex.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="font-black text-purple-200 text-xl">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-800">{ex.name}</p>
                          {ex.notes && (
                            <p className="text-sm text-slate-500 mt-1 bg-slate-100 px-2 py-1 rounded inline-block">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pl-8 md:pl-0">
                        {ex.sets && (
                          <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-100">
                            <Timer className="w-4 h-4 text-purple-500" /> {ex.sets}
                          </div>
                        )}
                        {ex.reps && (
                          <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-100">
                            <Repeat className="w-4 h-4 text-purple-500" /> {ex.reps}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}