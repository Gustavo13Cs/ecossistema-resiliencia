import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function useCheckIn(patientId?: string) {
  const [loadingItems, setLoadingItems] = useState<string[]>([])
  const [completedItems, setCompletedItems] = useState<string[]>([])
  const [consistency, setConsistency] = useState(0)

  useEffect(() => {
    if (!patientId) return

    api.get(`/metrics/today/${patientId}`).then(res => {
      const completedNames = res.data.map((log: any) => log.itemName)
      setCompletedItems(completedNames)
    }).catch(console.error)

    api.get(`/metrics/consistency/${patientId}`).then(res => {
      setConsistency(res.data.percentage || 0)
    }).catch(console.error)

  }, [patientId])

  const handleCheckIn = async (type: 'MEAL' | 'WORKOUT', itemName: string) => {
    if (!patientId || completedItems.includes(itemName)) return

    setLoadingItems(prev => [...prev, itemName])
    try {
      await api.post('/metrics/checkin', { patientId, type, itemName })
      
      setCompletedItems(prev => [...prev, itemName])
      toast.success(`${itemName} concluído com sucesso! 🔥 Continue focado!`)
      
      const res = await api.get(`/metrics/consistency/${patientId}`)
      setConsistency(res.data.percentage || 0)
    } catch (error) {
      toast.error('Erro ao registar. Tente novamente.')
    } finally {
      setLoadingItems(prev => prev.filter(id => id !== itemName))
    }
  }

  return { handleCheckIn, loadingItems, completedItems, consistency }
}