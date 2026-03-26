"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SportSelector } from "@/components/sport-selector"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import axios from "axios"

export default function HomePage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState({
    totalWorkouts: 0,
    averageSleep: 0,
    averageMood: 0
  })
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth/login")
      return
    }
    axios.get("http://localhost:3000/metrics/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      setMetrics(response.data) 
    })
    .catch(() => {
      handleSignOut() 
    })
  }, [router])

  const handleSignOut = () => {
    localStorage.removeItem("token")
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-teal-50">
      {/* Cabeçalho */}
      <header className="bg-white/80 backdrop-blur border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              SafeMove B2B
            </h1>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
                <LogOut className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-gray-800">
              Painel de Resiliência da Equipe
            </h2>
            <p className="text-lg text-gray-600">Confira a saúde física e mental dos seus colaboradores hoje.</p>
          </div>

          {/* O Nosso Módulo de Métricas ganhando vida! */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-purple-100">
              <div className="text-3xl font-bold text-purple-600">{metrics.totalWorkouts}</div>
              <div className="text-sm font-medium text-gray-600 mt-1">Treinos Registrados</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-pink-100">
              <div className="text-3xl font-bold text-pink-600">{metrics.averageSleep}h</div>
              <div className="text-sm font-medium text-gray-600 mt-1">Média de Sono</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-teal-100">
              <div className="text-3xl font-bold text-teal-600">{metrics.averageMood} <span className="text-lg text-gray-400">/ 5</span></div>
              <div className="text-sm font-medium text-gray-600 mt-1">Humor Geral</div>
            </div>
          </div>
          <SportSelector />
          
        </div>
      </main>
    </div>
  )
}