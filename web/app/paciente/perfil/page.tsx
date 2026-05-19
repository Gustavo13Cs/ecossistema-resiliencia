"use client"
import { UserCircle, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

export default function PerfilPacientePage() {
  const { user, logout } = useAuth()

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-200 text-slate-600 rounded-xl">
          <UserCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Meu Perfil</h1>
          <p className="text-slate-500">Gerir a sua conta e configurações.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase">Nome</p>
          <p className="text-lg font-medium text-slate-800">{user?.name || "Paciente"}</p>
        </div>
        
        <div className="pt-6 border-t border-slate-100">
          <Button onClick={logout} variant="outline" className="text-rose-500 border-rose-200 hover:bg-rose-50 font-bold">
            <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  )
}