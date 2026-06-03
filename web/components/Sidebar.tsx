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
  const mobileMenuItems = permittedMenuItems.slice(0, 4)

  // Define o subtítulo dinâmico com base no papel
  const roleName = (user as any).role === 'NUTRITIONIST' 
    ? 'Nutricionista' 
    : (user as any).role === 'PERSONAL' 
      ? 'Personal' 
      : 'Fisioterapeuta'

  return (
    <>
      {/* 🖥️ VERSÃO DESKTOP (Clonada da interface do Paciente) */}
      <aside className="w-64 bg-[#0B1120] min-h-screen text-slate-300 flex-col transition-all duration-300 hidden md:flex fixed top-0 left-0 z-40">
        
        {/* Logo e Área Escrita */}
        <div className="pt-10 pb-6 px-8 shrink-0">
          <h1 className="text-2xl font-black text-white tracking-tight">
            SafeMove
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Área do {roleName}
          </p>
        </div>

        {/* Perfil Rápido Compacto (Opcional, mas mantém a elegância) */}
        <div className="px-8 pb-4 shrink-0 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
            {(user as any).name?.charAt(0) || 'P'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate">{(user as any).name || 'Profissional'}</span>
          </div>
        </div>

        {/* Menus com Design Sólido Azul */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-4">
          {permittedMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href) || (item.href === '/home' && pathname === '/')

            return (
              <Link key={item.title} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white font-semibold shadow-md' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.title}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Rodapé (Logout) */}
        <div className="p-4 shrink-0 mb-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl py-6"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair da Conta
          </Button>
        </div>
      </aside>

      {/* 📱 VERSÃO MOBILE (Mantida com a barra inferior estilo app nativo) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex items-center justify-around h-20 px-2 pb-safe shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        {mobileMenuItems.map((item) => {
          const Icon = item.icon
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