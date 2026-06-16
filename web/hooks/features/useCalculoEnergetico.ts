import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const calculateAge = (birthDate: string) => {
  if (!birthDate) return 30;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const useCalculoEnergetico = (patientId: string) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  
  // Estados do Motor de Cálculo
  const [formula, setFormula] = useState("mifflin")
  const [activityFactor, setActivityFactor] = useState(1.2)

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await api.get(`/users/${patientId}`)
        setPatient(res.data)
        if (res.data.activityFactor) setActivityFactor(res.data.activityFactor)
      } catch (error) {
        toast.error("Erro ao carregar paciente.")
      }
    }
    if (patientId) fetchPatient()
  }, [patientId])

  // 🧠 A CIÊNCIA: Cálculo Automático
  const calculations = useMemo(() => {
    if (!patient || !patient.initialWeight || !patient.height) return { tmb: 0, get: 0, age: 0 }

    const weight = patient.initialWeight
    const height = patient.height
    const age = calculateAge(patient.birthDate)
    const isMale = patient.gender === 'M' || patient.gender?.toUpperCase() === 'MASCULINO'
    
    let tmb = 0

    if (formula === "harris") {
      if (isMale) tmb = 66.5 + (13.75 * weight) + (5.003 * height) - (6.75 * age)
      else tmb = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age)
    } else if (formula === "mifflin") {
      if (isMale) tmb = (10 * weight) + (6.25 * height) - (5 * age) + 5
      else tmb = (10 * weight) + (6.25 * height) - (5 * age) - 161
    } else if (formula === "fao") {
       if (isMale) {
         if (age >= 18 && age <= 30) tmb = (15.3 * weight) + 679;
         else if (age > 30 && age <= 60) tmb = (11.6 * weight) + 879;
         else tmb = (13.5 * weight) + 487;
       } else {
         if (age >= 18 && age <= 30) tmb = (14.7 * weight) + 496;
         else if (age > 30 && age <= 60) tmb = (8.7 * weight) + 829;
         else tmb = (10.5 * weight) + 596;
       }
    }

    const get = tmb * activityFactor
    return { tmb: Math.round(tmb), get: Math.round(get), age }
  }, [patient, formula, activityFactor])

  const handleSaveCalculation = async () => {
    setLoading(true)
    try {
      await api.patch(`/users/${patientId}`, {
        tmb: calculations.tmb,
        get: calculations.get,
        activityFactor: activityFactor
      })
      toast.success("Cálculo Energético salvo no perfil!")
      router.push(`/membros/${patientId}`)
    } catch (error) {
      toast.error("Erro ao salvar o cálculo.")
    } finally {
      setLoading(false)
    }
  }

  return {
    patient,
    loading,
    formula,
    setFormula,
    activityFactor,
    setActivityFactor,
    calculations,
    handleSaveCalculation
  }
}