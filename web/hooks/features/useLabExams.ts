import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export const useLabExams = (patientId: string) => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exams, setExams] = useState<any[]>([])
  
  // Lista unificada de todos os marcadores já registrados para preencher o select do gráfico
  const [uniqueMarkers, setUniqueMarkers] = useState<string[]>([])
  const [selectedChartMarker, setSelectedChartMarker] = useState<string>("")

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get(`/lab-exams/user/${patientId}`)
        setExams(res.data)
        
        // Extrai nomes únicos de marcadores
        const markersSet = new Set<string>()
        res.data.forEach((exam: any) => {
          exam.markers.forEach((m: any) => markersSet.add(m.name))
        })
        const markersArray = Array.from(markersSet).sort()
        setUniqueMarkers(markersArray)
        if (markersArray.length > 0) setSelectedChartMarker(markersArray[0])
      } catch (e) {
        toast.error("Erro ao carregar histórico de exames.")
      } finally {
        setLoading(false)
      }
    }
    if (patientId) fetchExams()
  }, [patientId])

  const chartData = useMemo(() => {
    if (!selectedChartMarker) return []
    
    return exams.filter(exam => exam.markers.some((m: any) => m.name === selectedChartMarker))
      .map(exam => {
        const marker = exam.markers.find((m: any) => m.name === selectedChartMarker)
        return {
          date: new Date(exam.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          fullDate: exam.date,
          value: marker.value,
          unit: marker.unit
        }
      })
  }, [exams, selectedChartMarker])

  const saveExam = async (payload: any) => {
    setSaving(true)
    try {
      await api.post('/lab-exams', { patientId, ...payload })
      toast.success("Exames registrados com sucesso!")
      router.push(`/membros/${patientId}`)
    } catch (e) {
      toast.error("Erro ao salvar exames.")
    } finally {
      setSaving(false)
    }
  }

  return {
    loading, saving, exams, uniqueMarkers, selectedChartMarker, setSelectedChartMarker, chartData, saveExam
  }
}