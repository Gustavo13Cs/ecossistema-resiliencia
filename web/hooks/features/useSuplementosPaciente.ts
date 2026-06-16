import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export const useSuplementosPaciente = (userId: string | undefined) => {
  const [supplements, setSupplements] = useState<any>(null)
  const [loadingSupplements, setLoadingSupplements] = useState(true)

  useEffect(() => {
    if (userId) {
      api.get(`/supplements/user/${userId}/active`)
        .then(res => setSupplements(res.data))
        .catch(() => setSupplements(null))
        .finally(() => setLoadingSupplements(false))
    } else {
      setLoadingSupplements(false)
    }
  }, [userId])

  return { supplements, loadingSupplements }
}