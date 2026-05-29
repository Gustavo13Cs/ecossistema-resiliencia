import { useState, useEffect } from "react"

export function useWaterTracker(dailyGoalLiters: number | null) {
  const [currentWaterMl, setCurrentWaterMl] = useState<number>(0)

  // Carrega a água de hoje quando a tela abre
  useEffect(() => {

    if (typeof window === 'undefined') return
    
    const today = new Date().toISOString().split('T')[0] 
    const stored = localStorage.getItem(`water_${today}`)
    
    if (stored) {
      setCurrentWaterMl(parseInt(stored, 10))
    }
  }, [])

  // Função para o paciente clicar e beber água
  const addWater = (ml: number) => {
    const today = new Date().toISOString().split('T')[0]
    const newValue = currentWaterMl + ml
    
    setCurrentWaterMl(newValue)
    localStorage.setItem(`water_${today}`, newValue.toString())
  }

  // Calcula a percentagem para a barra de progresso (Mínimo 0%, Máximo 100%)
  const progressPercentage = dailyGoalLiters 
    ? Math.min((currentWaterMl / (dailyGoalLiters * 1000)) * 100, 100) 
    : 0

  return { currentWaterMl, addWater, progressPercentage }
}