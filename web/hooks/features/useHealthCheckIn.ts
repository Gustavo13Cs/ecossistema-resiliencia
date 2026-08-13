import { useCallback, useState } from "react"
import axios from "axios"
import { api } from "@/lib/api"
import type { HealthCheckInInput } from "@/types/agenda"

const CREATE_ERROR = "Não foi possível salvar o check-in. Tente novamente."

function safeApiMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return CREATE_ERROR

  const message = error.response?.data?.message
  return typeof message === "string" && message.length > 0 && message.length <= 200
    ? message
    : CREATE_ERROR
}

export function useHealthCheckIn() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (input: HealthCheckInInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.post("/health-check-ins", input)
      return response.data
    } catch (requestError) {
      const message = safeApiMessage(requestError)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading, error }
}
