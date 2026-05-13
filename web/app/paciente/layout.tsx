"use client"

import { useAuth } from "@/contexts/auth-context"
import { Home, Dumbbell, Apple, Activity, UserCircle } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { name: "Início", href: "/paciente", icon: Home },
    { name: "Dieta", href: "/paciente/dieta", icon: Apple },
    { name: "Treino", href: "/paciente/treino", icon: Dumbbell },
    { name: "Fisio", href: "/paciente/reabilitacao", icon: Activity },
    { name: "Perfil", href: "/paciente/perfil", icon: UserCircle },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50 px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div className={`p-1.5 rounded-full ${isActive ? "bg-blue-50" : ""}`}>
                  <Icon className={`w-6 h-6 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? "font-bold" : "font-medium"}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 min-h-screen p-4 border-r border-slate-800">
        <div className="mb-10 mt-4 px-4">
          <h1 className="text-2xl font-black text-white tracking-tight">Safe<span className="text-blue-500">Move</span></h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Área do Paciente</p>
        </div>
        
        <div className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </aside>
    </div>
  )
}