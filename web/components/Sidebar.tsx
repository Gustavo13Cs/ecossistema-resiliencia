"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { 
  Home, Users, Apple, Dumbbell, Activity, 
  ClipboardList, Calendar, LogOut, HeartPulse, UserCircle
} from "lucide-react"

const MENU_ITEMS = [
  { title: "Início", icon: Home, href: "/home", roles: ["NUTRITIONIST", "PERSONAL", "PHYSIO"], mobileName: "Início" },
  { title: "Meus Pacientes", icon: Users, href: "/membros", roles: ["NUTRITIONIST", "PHYSIO"], mobileName: "Pacientes" },
  { title: "Meus Alunos", icon: Users, href: "/membros", roles: ["PERSONAL"], mobileName: "Alunos" },
  { title: "Avaliações", icon: Activity, href: "/avaliacoes", roles: ["NUTRITIONIST", "PERSONAL", "PHYSIO"], mobileName: "Avaliações" },
  { title: "Dietas", icon: ClipboardList, href: "/dietas", roles: ["NUTRITIONIST"], mobileName: "Dietas" },
  { title: "Alimentos", icon: Apple, href: "/alimentos", roles: ["NUTRITIONIST"], mobileName: "Alimentos" },
  { title: "Planilhas de Treino", icon: Dumbbell, href: "/treinos", roles: ["PERSONAL"], mobileName: "Treinos" },
  { title: "Reabilitação", icon: HeartPulse, href: "/reabilitacao", roles: ["PHYSIO"], mobileName: "Reabilitação" },
  { title: "Minha Rotina", icon: Calendar, href: "/minha-rotina", roles: ["PATIENT"], mobileName: "Rotina" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (pathname.startsWith('/paciente')) return null
  if (!user) return null

  const permittedMenuItems = MENU_ITEMS.filter(item => item.roles.includes((user as any).role))
  
  // Para o telemóvel, pegamos no máximo os 4 primeiros itens para caber o botão "Perfil/Sair" no final
  const mobileMenuItems = permittedMenuItems.slice(0, 4)

  return (
    <>
      {/* 🖥️ VERSÃO DESKTOP (Barra Lateral Escura) */}
      <aside className="w-64 bg-slate-900 min-h-screen text-slate-300 flex-col transition-all duration-300 hidden md:flex fixed top-0 left-0 z-40 border-r border-slate-800">
        <div className="h-20 flex items-center px-8 border-b border-slate-800 shrink-0">
          <h1 className="text-2xl font-black text-white bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            SafeMove
          </h1>
        </div>

        <div className="p-6 border-b border-slate-800 bg-slate-800/30 shrink-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Logado como</p>
          <p className="font-bold text-white truncate">{(user as any).name || 'Profissional'}</p>
          <p className="text-xs text-teal-400 font-medium truncate">{(user as any).role}</p>
        </div>

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

        <div className="p-4 border-t border-slate-800 shrink-0">
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

      {/* 📱 VERSÃO MOBILE (Barra Inferior Clara - Igual ao App do Paciente) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex items-center justify-around h-20 px-2 pb-safe shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        {mobileMenuItems.map((item) => {
          const Icon = item.icon
          // Validação mais flexível para o Início (home vs /)
          const isActive = pathname.startsWith(item.href) || (item.href === '/home' && pathname === '/')

          return (
            <Link key={item.title} href={item.href} className="flex-1">
              <div className="flex flex-col items-center justify-center gap-1 w-full h-full py-2">
                <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-blue-100' : 'bg-transparent'}`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                  {item.mobileName}
                </span>
              </div>
            </Link>
          )
        })}

        {/* Botão de Perfil/Sair fixo como último item */}
        <button onClick={logout} className="flex-1 flex flex-col items-center justify-center gap-1 w-full h-full py-2">
           <div className="p-1.5 rounded-full bg-transparent hover:bg-rose-50 transition-colors">
              <UserCircle className="w-6 h-6 text-slate-400 hover:text-rose-500 transition-colors" />
           </div>
           <span className="text-[10px] font-medium text-slate-500 hover:text-rose-500 transition-colors">
             Sair
           </span>
        </button>
      </nav>
    </>
  )
}