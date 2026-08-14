"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import type { HealthCheckInConsent } from "@/types/agenda"

type ConsentResponse = Omit<HealthCheckInConsent, "category"> & { category: string }

const FALLBACK_ERROR = "Não foi possível carregar os compartilhamentos."

function safeApiMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return FALLBACK_ERROR
  const message = error.response?.data?.message
  return typeof message === "string" && message.length > 0 && message.length <= 200
    ? message
    : FALLBACK_ERROR
}

export function ConsentSharingCard() {
  const [open, setOpen] = useState(false)
  const [consents, setConsents] = useState<HealthCheckInConsent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadConsents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<ConsentResponse[]>("/consents/me")
      setConsents(
        response.data.filter(
          (entry): entry is HealthCheckInConsent => entry.category === "HEALTH_CHECK_IN",
        ),
      )
    } catch (requestError) {
      setError(safeApiMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void loadConsents()
  }, [loadConsents, open])

  const updateConsent = async (consent: HealthCheckInConsent, granted: boolean) => {
    setUpdatingId(consent.professional.id)
    try {
      await api.put(
        `/consents/${consent.professional.id}/HEALTH_CHECK_IN`,
        { granted },
      )
      await loadConsents()
      toast.success(granted ? "Compartilhamento concedido" : "Compartilhamento revogado")
    } catch (requestError) {
      toast.error(safeApiMessage(requestError))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto">
          <ShieldCheck aria-hidden="true" />
          Compartilhamento de saúde
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhamento de saúde</DialogTitle>
          <DialogDescription>
            Controle quais profissionais com vínculo ativo podem visualizar seus check-ins.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3" aria-label="Carregando compartilhamentos">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-red-600">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadConsents()}>
              Tentar novamente
            </Button>
          </div>
        ) : consents.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            Nenhum profissional com vínculo ativo.
          </p>
        ) : (
          <div className="space-y-2">
            {consents.map((consent) => {
              const controlId = `consent-${consent.professional.id}`
              return (
                <Label
                  key={consent.professional.id}
                  htmlFor={controlId}
                  className="flex min-h-11 cursor-pointer justify-between gap-4 rounded-lg border border-slate-200 p-3"
                >
                  <span>
                    <span className="block font-semibold text-slate-800">
                      {consent.professional.name}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {consent.professional.role}
                    </span>
                  </span>
                  <Switch
                    id={controlId}
                    data-testid={controlId}
                    checked={consent.granted}
                    disabled={updatingId === consent.professional.id}
                    aria-label={`Compartilhar check-ins com ${consent.professional.name}`}
                    onCheckedChange={(granted) => void updateConsent(consent, granted)}
                  />
                </Label>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
