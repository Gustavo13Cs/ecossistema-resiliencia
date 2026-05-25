import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export interface UserProfileData {
  id?: string
  name?: string
  email?: string
  phone?: string | null
  gender?: string | null
  birthDate?: string | null
  height?: number | null
  initialWeight?: number | null
  goal?: string | null
  allergies?: string | null
  pathologies?: string | null
  typicalSleep?: string | null
  exerciseType?: string | null
  exerciseFrequency?: string | null
  workActivityLevel?: string | null
}

export function useProfile(userId?: string) {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [formData, setFormData] = useState<UserProfileData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) return

    api.get<UserProfileData>(`/users/${userId}`)
      .then(res => {
        setProfileData(res.data)
        setFormData({
          phone: res.data.phone || "",
          gender: res.data.gender || "",
          goal: res.data.goal || "",
          height: res.data.height ?? undefined,
          initialWeight: res.data.initialWeight ?? undefined,
          allergies: res.data.allergies || "",
          pathologies: res.data.pathologies || "",
          typicalSleep: res.data.typicalSleep || "",
          exerciseType: res.data.exerciseType || "",
          exerciseFrequency: res.data.exerciseFrequency || "",
          workActivityLevel: res.data.workActivityLevel || ""
        })
      })
      .catch(() => toast.error("Erro ao carregar dados do perfil."))
      .finally(() => setLoading(false))
  }, [userId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value
    }))
  }

  const saveProfile = async () => {
    if (!userId) return
    
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === "" ? null : v])
      )

      await api.patch(`/users/${userId}`, payload)
      toast.success("Perfil atualizado com sucesso!")
    } catch (error) {
      toast.error("Erro ao atualizar o perfil.")
    } finally {
      setSaving(false)
    }
  }

  return { profileData, formData, handleChange, saveProfile, loading, saving }
}