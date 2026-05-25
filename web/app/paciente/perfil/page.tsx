"use client"

import { UserCircle, LogOut, Scale, Save, Activity, HeartPulse, Phone, Ruler, Target, Dumbbell, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/hooks/useProfile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PerfilPacientePage() {
  const { user, logout } = useAuth()
  const { profileData, formData, handleChange, saveProfile, loading, saving } = useProfile(user?.sub)

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-200 text-slate-600 rounded-xl">
            <UserCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">O Meu Perfil</h1>
            <p className="text-slate-500">Mantenha os seus dados atualizados para os seus profissionais.</p>
          </div>
        </div>
        
        <Button 
          onClick={saveProfile}
          disabled={saving}
          className="hidden md:flex h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shadow-md transition-all active:scale-95"
        >
          {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Save className="w-4 h-4 mr-2" /> Guardar Perfil</>}
        </Button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* CARTÃO 1: IDENTIFICAÇÃO E CONTACTO */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
              <Phone className="w-5 h-5 text-slate-400" /> Identificação e Contacto
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nome Completo</label>
                <Input value={profileData?.name || ""} disabled className="bg-slate-50 border-slate-200" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">E-mail</label>
                <Input value={profileData?.email || ""} disabled className="bg-slate-50 border-slate-200" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Telefone / WhatsApp</label>
                <Input name="phone" value={formData.phone || ""} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Género</label>
                <select name="gender" value={formData.gender || ""} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Selecione...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARTÃO 2: BIOMETRIA E METAS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
              <Target className="w-5 h-5 text-slate-400" /> Composição Corporal & Objetivos
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Scale className="w-3 h-3"/> Peso Atual (kg)</label>
                <Input name="initialWeight" type="number" value={formData.initialWeight || ""} onChange={handleChange} placeholder="Ex: 75.5" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Ruler className="w-3 h-3"/> Altura (cm)</label>
                <Input name="height" type="number" value={formData.height || ""} onChange={handleChange} placeholder="Ex: 175" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Objetivo Principal</label>
                <select name="goal" value={formData.goal || ""} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Selecione...</option>
                  <option value="Hipertrofia">Ganho de Massa (Hipertrofia)</option>
                  <option value="Emagrecimento">Emagrecimento</option>
                  <option value="Manutencao">Manutenção Saudável</option>
                  <option value="Reabilitacao">Reabilitação Clínica</option>
                </select>
              </div>
            </div>
          </div>

          {/* 🌟 CARTÃO 3: NOVO CARD DE ATIVIDADE FÍSICA E PERIODIZAÇÃO */}
          <div className="bg-gradient-to-r from-teal-50/60 to-blue-50/60 p-6 rounded-2xl border border-teal-100 shadow-sm space-y-6">
            <h3 className="font-bold text-teal-900 flex items-center gap-2 pb-2 border-b border-teal-200/50">
              <Dumbbell className="w-5 h-5 text-teal-600" /> Rotina de Treinos & Atividade Física
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Nível de Experiência */}
              <div>
                <label className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1 block">Nível de Experiência</label>
                <select name="exerciseType" value={formData.exerciseType || ""} onChange={handleChange} className="flex h-10 w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800">
                  <option value="">Selecione...</option>
                  <option value="Iniciante">Iniciante (Nunca treinou / parado)</option>
                  <option value="Intermediario">Intermediário (Treina regularmente)</option>
                  <option value="Avancado">Avançado (Treino consistente há anos)</option>
                </select>
              </div>

              {/* Frequência Semanal */}
              <div>
                <label className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Dias Disponíveis por Semana
                </label>
                <select name="exerciseFrequency" value={formData.exerciseFrequency || ""} onChange={handleChange} className="flex h-10 w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800">
                  <option value="">Selecione...</option>
                  <option value="1">1 dia por semana</option>
                  <option value="2">2 dias por semana</option>
                  <option value="3">3 dias por semana (Ideal ABC)</option>
                  <option value="4">4 dias por semana (Ideal ABCD)</option>
                  <option value="5">5 dias por semana (Ideal ABCDE)</option>
                  <option value="6">6 dias por semana</option>
                  <option value="7">Todos os dias (7 dias)</option>
                </select>
              </div>

              {/* Nível de Atividade Física Geral (TDEE) */}
              <div>
                <label className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1 block">Nível de Atividade Geral</label>
                <select name="workActivityLevel" value={formData.workActivityLevel || ""} onChange={handleChange} className="flex h-10 w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800">
                  <option value="">Selecione...</option>
                  <option value="Sedentario">Sedentário (Trabalho sentado, sem exercício)</option>
                  <option value="Levemente ativo">Levemente Ativo (Exercício leve 1-3x/sem)</option>
                  <option value="Moderado">Moderadamente Ativo (Treino intenso 3-5x/sem)</option>
                  <option value="Muito ativo">Muito Ativo (Treino diário pesado / trabalho braçal)</option>
                </select>
              </div>

            </div>
          </div>

          {/* CARTÃO 4: HISTÓRICO CLÍNICO */}
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
              <HeartPulse className="w-5 h-5 text-rose-400" /> Histórico Clínico e Estilo de Vida
            </h3>
            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Alergias ou Intolerâncias (Alimentares ou Medicamentos)</label>
                <textarea name="allergies" value={formData.allergies || ""} onChange={handleChange} placeholder="Ex: Intolerância à lactose, Alergia a amendoim..." className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Patologias ou Lesões (Atuais ou Passadas)</label>
                <textarea name="pathologies" value={formData.pathologies || ""} onChange={handleChange} placeholder="Ex: Condromalácia patelar, Hipertensão..." className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Como é o seu sono geralmente?</label>
                <Input name="typicalSleep" value={formData.typicalSleep || ""} onChange={handleChange} placeholder="Ex: Durmo 6 horas, acordo cansado..." />
              </div>
            </div>
          </div>

          {/* BOTÕES DE RODAPÉ */}
          <div className="pt-6 flex flex-col md:flex-row gap-4 justify-between items-center">
            <Button onClick={logout} variant="outline" className="w-full md:w-auto text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 font-bold h-12 px-8 order-2 md:order-1">
              <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
            </Button>

            <Button onClick={saveProfile} disabled={saving} className="w-full md:hidden h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md order-1">
               {saving ? "A Guardar..." : "Guardar Perfil"}
            </Button>
          </div>

        </div>
      )}
    </div>
  )
}