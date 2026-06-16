"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Beaker, CheckCircle2, Printer, Trash2, Plus, Pill, Info } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSuplementos } from "@/hooks/features/useSuplementos" // 🌟 O nosso Hook entra em ação

export default function NovaSuplementacaoPage() {
  const params = useParams()
  
  const { 
    patientName, loading, planInfo, setPlanInfo, items, 
    addItem, removeItem, updateItem, savePlan, handlePrint 
  } = useSuplementos(params.id as string)

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      
      {/* 🌟 MODO TELA (INTERAÇÃO DO NUTRICIONISTA) */}
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto max-w-5xl space-y-6 print:hidden">
        
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border-b-4 border-amber-500">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}><Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-slate-600" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Beaker className="w-6 h-6 text-amber-600" /> Prescrição de Fórmulas
              </h1>
              <p className="text-slate-500 font-medium mt-1">Paciente: <span className="text-amber-700">{patientName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handlePrint} className="h-12 border-slate-300 text-slate-700"><Printer className="w-5 h-5 mr-2" /> Gerar PDF</Button>
            <Button onClick={savePlan} disabled={loading} className="h-12 px-8 bg-amber-600 hover:bg-amber-700 text-white text-lg font-bold shadow-md">
              <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "A Salvar..." : "Finalizar Receita"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {items.map((item, index) => (
            <Card key={item.id} className="border border-slate-200 shadow-md overflow-hidden">
              <CardHeader className="bg-slate-800 py-3 border-b-4 border-amber-500 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-3 w-full md:w-2/3">
                    <Pill className="w-5 h-5 text-amber-400" />
                    <Input placeholder="Nome do Suplemento ou Fórmula" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="font-bold border-none shadow-none text-white text-lg bg-slate-700/50 flex-1" />
                 </div>
                 <Button variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-slate-700 h-8 p-2" onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Apagar
                 </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-5 bg-white">
                <div className="space-y-2">
                   <Label className="font-bold text-slate-600">Composição (Para fórmulas manipuladas)</Label>
                   <textarea placeholder="Liste os ativos e as miligramas aqui..." value={item.composition} onChange={(e) => updateItem(item.id, 'composition', e.target.value)} className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 resize-y font-mono bg-slate-50" />
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                     <Label className="font-bold text-slate-600">Dosagem (Qtd)</Label>
                     <Input placeholder="Ex: 1 dose, 2 cápsulas, 5g" value={item.dosage} onChange={(e) => updateItem(item.id, 'dosage', e.target.value)} className="h-11 bg-slate-50 font-semibold" />
                   </div>
                   <div className="space-y-2">
                     <Label className="font-bold text-slate-600">Posologia / Instrução de Uso</Label>
                     <Input placeholder="Ex: Tomar ao acordar em jejum" value={item.instructions} onChange={(e) => updateItem(item.id, 'instructions', e.target.value)} className="h-11 bg-slate-50 font-semibold" />
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button onClick={addItem} className="w-full h-14 border-2 border-dashed border-slate-300 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition-all font-bold text-lg">
            <Plus className="w-5 h-5 mr-2" /> Adicionar Nova Fórmula ou Suplemento
          </Button>

          <Card className="bg-slate-800 text-white border-0 shadow-lg mt-8">
             <CardHeader className="pb-3 border-b border-slate-700">
                <CardTitle className="text-lg flex items-center gap-2"><Info className="w-5 h-5 text-amber-400" /> Observações do Receituário</CardTitle>
             </CardHeader>
             <CardContent className="pt-4">
                <textarea value={planInfo.notes} onChange={(e) => setPlanInfo({...planInfo, notes: e.target.value})} className="w-full min-h-[80px] p-4 bg-slate-900/50 rounded-xl text-sm placeholder:text-slate-500 border border-slate-700 focus:ring-1 focus:ring-amber-500 outline-none resize-y" />
             </CardContent>
          </Card>
        </div>
      </div>

      {/* 🌟 MODO IMPRESSÃO (O RECEITUÁRIO PDF PERFEITO) */}
      <div className="hidden print:block w-full max-w-3xl mx-auto bg-white min-h-screen relative">
         <div className="border-b-4 border-amber-600 pb-6 mb-10 text-center mt-12">
           <h1 className="text-4xl font-black text-slate-800 uppercase tracking-widest">Receituário Nutricional</h1>
           <h2 className="text-xl text-slate-600 mt-3 font-medium">Paciente: <span className="text-slate-800 font-bold">{patientName}</span></h2>
           <p className="text-slate-500 text-sm mt-1">Data da Prescrição: {new Date().toLocaleDateString('pt-BR')}</p>
         </div>

         <div className="space-y-10 px-8">
           <h3 className="text-2xl font-black text-slate-800 border-b-2 border-slate-100 pb-2">Uso Interno</h3>
           
           {items.map((item, idx) => (
              <div key={item.id} className="space-y-3 pb-6 break-inside-avoid">
                 <div className="flex justify-between items-baseline border-b border-dashed border-slate-300 pb-2">
                   <p className="font-black text-xl text-slate-900">{idx + 1}. {item.name}</p>
                   <p className="font-bold text-lg text-slate-700 bg-slate-50 px-3 py-1 rounded">{item.dosage}</p>
                 </div>
                 
                 {item.composition && (
                   <div className="pl-6 pt-2">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Composição:</p>
                     <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{item.composition}</p>
                   </div>
                 )}
                 
                 <div className="pl-6 bg-slate-50 p-4 rounded-lg mt-3 border border-slate-100">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Posologia / Modo de Uso:</p>
                   <p className="text-slate-800 font-bold italic">{item.instructions}</p>
                 </div>
              </div>
           ))}
         </div>

         <div className="mt-20 pt-8 border-t border-slate-200 text-center px-20">
            <p className="text-sm font-medium text-slate-500 mb-16 italic">{planInfo.notes}</p>
            <div className="w-72 border-t-2 border-slate-800 mx-auto pt-2">
               <p className="font-bold text-slate-800">Assinatura e Carimbo do Profissional</p>
            </div>
         </div>
      </div>

    </div>
  )
}