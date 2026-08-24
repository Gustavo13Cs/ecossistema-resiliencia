import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export const useSuplementos = (patientId: string) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patientName, setPatientName] = useState("A carregar...")

  const [planInfo, setPlanInfo] = useState({
    title: "Receituário Nutricional",
    notes: "Uso contínuo por 60 dias. Manter as fórmulas em local fresco e arejado."
  })

  const [items, setItems] = useState([
    { 
      id: `i${Date.now()}`, 
      name: "Fórmula 1 - Ação Termogênica e Foco", 
      composition: "Morosil ......................... 300mg\nPicolinato de Cromo ... 200mcg\nRhodiola Rosea ........... 200mg\nExcipiente q.s.p ......... 1 cápsula", 
      dosage: "1 dose (1 cápsula)", 
      instructions: "Tomar 1 cápsula 30 minutos antes do almoço." 
    }
  ])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const userRes = await api.get(`/users/${patientId}`)
        setPatientName(userRes.data.name)

        const planRes = await api.get(`/supplements/user/${patientId}/active`)
        if (planRes.data) {
          setPlanInfo({ title: planRes.data.title, notes: planRes.data.notes || "" })
          if (planRes.data.items?.length > 0) {
             setItems(planRes.data.items.map((i: any) => ({ ...i, id: i.id || `i${Math.random()}` })))
          }
        }
      } catch (e) {}
    }
    if (patientId) fetchInitialData()
  }, [patientId])

  const addItem = () => setItems([...items, { id: `i${Date.now()}`, name: "", composition: "", dosage: "", instructions: "" }])
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id))
  const updateItem = (id: string, field: string, value: string) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))

  const savePlan = async () => {
    setLoading(true)
    try {
      await api.post('/supplements', { patientId, ...planInfo, items: items.map(({id, ...rest}) => rest) })
      toast.success("Receituário salvo com sucesso!")
      router.push(`/clientes/${patientId}`)
    } catch (e) {
      toast.error("Erro ao salvar receituário.")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    setTimeout(() => window.print(), 300)
  }

  return { 
    patientName, loading, planInfo, setPlanInfo, items, 
    addItem, removeItem, updateItem, savePlan, handlePrint 
  }
}