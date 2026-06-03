"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { 
  Home, Users, Apple, Dumbbell, Activity, 
  ClipboardList, Calendar, LogOut, HeartPulse, Menu 
} from "lucide-react"

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

const MENU_ITEMS = [
  { title: "Início", icon: Home, href: "/home", roles: ["NUTRITIONIST", "PERSONAL", "PHYSIO"] },
  { title: "Meus Pacientes", icon: Users, href: "/membros", roles: ["NUTRITIONIST", "PHYSIO"] },
  { title: "Meus Alunos", icon: Users, href: "/membros", roles: ["PERSONAL"] },
  { title: "Avaliações", icon: Activity, href: "/avaliacoes", roles: ["NUTRITIONIST", "PERSONAL", "PHYSIO"] },
  { title: "Dietas", icon: ClipboardList, href: "/dietas", roles: ["NUTRITIONIST"] },
  { title: "Alimentos", icon: Apple, href: "/alimentos", roles: ["NUTRITIONIST"] },
  { title: "Planilhas de Treino", icon: Dumbbell, href: "/treinos", roles: ["PERSONAL"] },
  { title: "Reabilitação", icon: HeartPulse, href: "/reabilitacao", roles: ["PHYSIO"] },
  { title: "Minha Rotina", icon: Calendar, href: "/minha-rotina", roles: ["PATIENT"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  // 2. Estado para controlar se a gaveta do telemóvel está aberta
  const [isOpen, setIsOpen] = useState(false)

  if (pathname.startsWith('/paciente')) return null
  if (!user) return null

  const permittedMenuItems = MENU_ITEMS.filter(item => item.roles.includes((user as any).role))

  // 3. Isolamos o "Miolo" da barra para não repetir código
  const SidebarContent = () => (
    <>
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
            // Ao clicar no link, a gaveta fecha automaticamente no telemóvel
            <Link key={item.title} href={item.href} onClick={() => setIsOpen(false)}>
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
    </>
  )

  return (
    <>
      {/* 🖥️ VERSÃO DESKTOP: Fica fixa na esquerda, esconde no telemóvel (hidden md:flex) */}
      <aside className="w-64 bg-slate-900 min-h-screen text-slate-300 flex-col transition-all duration-300 hidden md:flex fixed top-0 left-0 z-40 border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* 📱 VERSÃO MOBILE: Barra no topo com o botão Hambúrguer (aparece só no telemóvel) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
        <h1 className="text-xl font-black text-white bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          SafeMove
        </h1>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          
          <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-slate-800 text-slate-300 flex flex-col pt-0">
            <SheetTitle className="sr-only">Menu de Navegação SafeMove</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}