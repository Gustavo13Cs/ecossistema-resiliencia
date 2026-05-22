import { useState, useEffect } from "react"

export interface WeatherData {
  temperature: number
  condition: string
  icon: string
  healthTip: string
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)

  useEffect(() => {
    // 1. Pede a localização do paciente
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            
            // 2. Chama a API Externa Gratuita (Open-Meteo)
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
            const data = await res.json()
            
            const temp = data.current_weather.temperature
            const code = data.current_weather.weathercode 
            
            // 3. Inteligência Artificial de Dicas
            let condition = "Céu Limpo"
            let icon = "☀️"
            let healthTip = "Clima perfeito para um treino ao ar livre!"

            // Lógica de Chuva (Códigos WMO 51 a 99)
            if (code >= 51 && code <= 99) {
              condition = "Chuvoso"
              icon = "🌧️"
              healthTip = "Dia de chuva! Excelente oportunidade para focar num treino em casa ou alongamento."
            } 
            // Lógica de Calor
            else if (temp >= 28) {
              condition = "Ensolarado / Quente"
              icon = "🔥"
              healthTip = `Faz ${Math.round(temp)}°C lá fora! Lembre-se de beber mais água durante o treino.`
            } 
            // Lógica de Frio
            else if (temp <= 15) {
              condition = "Frio"
              icon = "❄️"
              healthTip = "O clima está mais frio. Faça um bom aquecimento articular antes de começar!"
            }

            setWeather({ temperature: Math.round(temp), condition, icon, healthTip })
          } catch (error) {
            console.error("Erro na API de Clima", error)
          } finally {
            setLoadingWeather(false)
          }
        },
        () => {
          // Se o utilizador recusar partilhar a localização
          setLoadingWeather(false)
        }
      )
    } else {
      setLoadingWeather(false)
    }
  }, [])

  return { weather, loadingWeather }
}