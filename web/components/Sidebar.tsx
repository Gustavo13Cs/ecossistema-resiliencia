"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { 
  Home, Users, Apple, Dumbbell, Activity, 
  ClipboardList, Calendar, LogOut, HeartPulse 
} from "lucide-react"

const MENU_ITEMS = [
  // 🌍 Visível para todos
  { title: "Início", icon: Home, href: "/dashboard", roles: ["NUTRITIONIST", "PERSONAL", "PHYSIO", "PATIENT"] },
  
  // 👨‍⚕️ Gestão (Profissionais)
  { title: "Meus Pacientes", icon: Users, href: "/membros", roles: ["NUTRITIONIST", "PHYSIO"] },
  { title: "Meus Alunos", icon: Users, href: "/membros", roles: ["PERSONAL"] },
  { title: "Avaliações", icon: Activity, href: "/avaliacoes", roles: ["NUTRITIONIST", "PERSONAL", "PHYSIO"] },
  
  // 🍏 Exclusivo Nutrição
  { title: "Dietas", icon: ClipboardList, href: "/dietas", roles: ["NUTRITIONIST"] },
  { title: "Alimentos", icon: Apple, href: "/alimentos", roles: ["NUTRITIONIST"] },
  
  // 🏋️ Exclusivo Personal Trainer
  { title: "Planilhas de Treino", icon: Dumbbell, href: "/treinos", roles: ["PERSONAL"] },
  
  // 💆 Exclusivo Fisioterapia
  { title: "Reabilitação", icon: HeartPulse, href: "/reabilitacao", roles: ["PHYSIO"] },
  
  // 👤 Exclusivo Paciente (Portal do Paciente)
  { title: "Minha Rotina", icon: Calendar, href: "/minha-rotina", roles: ["PATIENT"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) return null

  const permittedMenuItems = MENU_ITEMS.filter(item => item.roles.includes((user as any).role))

  return (
    <aside className="w-64 bg-slate-900 min-h-screen text-slate-300 flex flex-col transition-all duration-300 hidden md:flex fixed">
      
      {/* Cabeçalho do Menu */}
      <div className="h-20 flex items-center px-8 border-b border-slate-800">
        <h1 className="text-2xl font-black text-white bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          SafeMove
        </h1>
      </div>

      {/* Perfil Rápido */}
      <div className="p-6 border-b border-slate-800 bg-slate-800/30">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Logado como</p>
        <p className="font-bold text-white truncate">{(user as any).name || 'Profissional'}</p>
        <p className="text-xs text-teal-400 font-medium truncate">{(user as any).role}</p>
      </div>

      {/* Botões Dinâmicos */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {permittedMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link key={item.title} href={item.href}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{item.title}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Rodapé (Logout) */}
      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair da Conta
        </Button>
      </div>
    </aside>
  )
}