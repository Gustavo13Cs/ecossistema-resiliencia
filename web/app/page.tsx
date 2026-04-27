import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Shield, Brain, Activity, LineChart } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-teal-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-600 to-teal-500 bg-clip-text text-transparent leading-tight">
            Ecossistema de Resiliência
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-2xl leading-relaxed">
            Plataforma corporativa para gestão holística de saúde física, sono e bem-estar.
          </p>
          <p className="text-lg text-gray-600 max-w-xl">
            Transforme dados de saúde em inteligência para o RH e melhore a qualidade de vida da sua equipe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-lg text-white"
            >
              <Link href="/auth/login">Acesso Corporativo</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Segurança LGPD</h3>
            <p className="text-sm text-gray-600">Dados criptografados e controle de acesso rigoroso para proteção da equipe.</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Saúde Mental</h3>
            <p className="text-sm text-gray-600">Acompanhamento diário de humor e qualidade do sono dos colaboradores.</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Atividade Física</h3>
            <p className="text-sm text-gray-600">Registro de treinos e intensidades para incentivar uma rotina ativa.</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
              <LineChart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Métricas de RH</h3>
            <p className="text-sm text-gray-600">Dashboards agregados para tomadas de decisão estratégicas pela gestão.</p>
          </div>
        </div>
      </div>
    </div>
  )
}