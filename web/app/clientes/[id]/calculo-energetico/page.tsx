"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Calculator, Activity, Flame, Scale, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useCalculoEnergetico } from "@/hooks/features/useCalculoEnergetico" 

export default function CalculoEnergeticoPage() {
  const params = useParams()
  
  // 🌟 Usando o Hook: Puxamos todas as variáveis de lógica prontas!
  const {
    patient,
    loading,
    formula,
    setFormula,
    activityFactor,
    setActivityFactor,
    calculations,
    handleSaveCalculation
  } = useCalculoEnergetico(params.id as string)

  if (!patient) return <div className="p-8 text-center text-slate-500 animate-pulse">A calcular a biologia...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto max-w-5xl space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border-b-4 border-indigo-500">
          <div className="flex items-center gap-4">
            <Link href={`/clientes/${params.id}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-indigo-600" /> Cálculo Energético (TMB/GET)
              </h1>
              <p className="text-slate-500 font-medium mt-1">Paciente: <span className="text-indigo-700">{patient.name}</span></p>
            </div>
          </div>
          
          <Button onClick={handleSaveCalculation} disabled={loading} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold shadow-md">
            <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "A Salvar..." : "Gravar no Perfil"}
          </Button>
        </div>

        {/* ALERTA SE FALTAR DADOS */}
        {(!patient.initialWeight || !patient.height) && (
           <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
             <Scale className="w-5 h-5 shrink-0" />
             <p className="font-bold text-sm">Aviso: O paciente não tem Peso ou Altura registados na ficha. O cálculo não funcionará corretamente.</p>
           </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* PAINEL DE CONTROLE (ESQUERDA) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700"><Activity className="w-4 h-4"/> Variáveis Biológicas</CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-2 gap-4 bg-slate-50/30">
                 <div><Label className="text-xs text-slate-500">Peso Atual</Label><p className="font-black text-lg text-slate-800">{patient.initialWeight || '--'} kg</p></div>
                 <div><Label className="text-xs text-slate-500">Altura</Label><p className="font-black text-lg text-slate-800">{patient.height || '--'} cm</p></div>
                 <div><Label className="text-xs text-slate-500">Idade Calculada</Label><p className="font-black text-lg text-slate-800">{calculations.age > 0 ? `${calculations.age} anos` : '--'}</p></div>
                 <div><Label className="text-xs text-slate-500">Sexo Biológico</Label><p className="font-black text-lg text-slate-800">{patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : '--'}</p></div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-5 space-y-6">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">Fórmula Preditiva (TMB)</Label>
                  <select 
                    value={formula} 
                    onChange={e => setFormula(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="mifflin">Mifflin-St. Jeor (Recomendado)</option>
                    <option value="harris">Harris-Benedict (Clássica)</option>
                    <option value="fao">FAO / OMS</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">Fator de Atividade (FA)</Label>
                  <div className="space-y-2">
                    {[
                      { val: 1.2, label: "Sedentário (Pouco/Nenhum exercício)" },
                      { val: 1.375, label: "Leve (Exercício 1-3 dias/sem)" },
                      { val: 1.55, label: "Moderado (Exercício 3-5 dias/sem)" },
                      { val: 1.725, label: "Muito Ativo (Exercício 6-7 dias/sem)" },
                    ].map(fa => (
                      <div 
                        key={fa.val} 
                        onClick={() => setActivityFactor(fa.val)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${activityFactor === fa.val ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-semibold ${activityFactor === fa.val ? 'text-indigo-700' : 'text-slate-600'}`}>{fa.label}</span>
                          <span className="text-xs font-black text-slate-400">x{fa.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PAINEL DE RESULTADOS (DIREITA) */}
          <div className="lg:col-span-7 space-y-6">
             <div className="grid sm:grid-cols-2 gap-4">
                <Card className="bg-slate-800 text-white border-0 shadow-lg relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 opacity-10"><Flame className="w-32 h-32" /></div>
                   <CardContent className="p-6 relative z-10">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Taxa Metabólica Basal (TMB)</p>
                     <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black">{calculations.tmb}</span>
                       <span className="text-slate-400 font-medium">kcal/dia</span>
                     </div>
                     <p className="text-xs text-slate-400 mt-4 leading-relaxed">Calorias necessárias apenas para manter as funções vitais do corpo em repouso.</p>
                   </CardContent>
                </Card>

                <Card className="bg-indigo-600 text-white border-0 shadow-lg relative overflow-hidden">
                   <div className="absolute -right-4 -top-4 opacity-10"><Activity className="w-32 h-32" /></div>
                   <CardContent className="p-6 relative z-10">
                     <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Gasto Energético Total (GET)</p>
                     <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-black">{calculations.get}</span>
                       <span className="text-indigo-200 font-medium">kcal/dia</span>
                     </div>
                     <p className="text-xs text-indigo-200 mt-4 leading-relaxed">A sua meta de manutenção. É a TMB multiplicada pelo fator de atividade.</p>
                   </CardContent>
                </Card>
             </div>

             <Card className="border-0 shadow-md">
                <CardHeader className="bg-slate-50 border-b py-4">
                  <CardTitle className="text-base text-slate-700">Projeção de Metas (Dietética)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y divide-slate-100">
                     <div className="p-5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2"><Scale className="w-4 h-4 text-slate-400"/> Manutenção de Peso</p>
                          <p className="text-xs text-slate-500 mt-1">Manter a ingestão igual ao GET.</p>
                        </div>
                        <span className="text-xl font-black text-slate-700">{calculations.get} <span className="text-sm font-medium text-slate-400">kcal</span></span>
                     </div>
                     <div className="p-5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-rose-600 flex items-center gap-2"><TrendingDown className="w-4 h-4"/> Emagrecimento (Déficit Leve)</p>
                          <p className="text-xs text-slate-500 mt-1">Déficit de ~500 kcal para perda sustentável.</p>
                        </div>
                        <span className="text-xl font-black text-rose-600">{calculations.get > 500 ? calculations.get - 500 : 0} <span className="text-sm font-medium text-rose-300">kcal</span></span>
                     </div>
                     <div className="p-5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-emerald-600 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Hipertrofia (Superávit Leve)</p>
                          <p className="text-xs text-slate-500 mt-1">Superávit de ~500 kcal para ganho de massa.</p>
                        </div>
                        <span className="text-xl font-black text-emerald-600">{calculations.get + 500} <span className="text-sm font-medium text-emerald-300">kcal</span></span>
                     </div>
                   </div>
                </CardContent>
             </Card>
          </div>

        </div>
      </div>
    </div>
  )
}