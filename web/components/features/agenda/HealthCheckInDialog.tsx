"use client"

import { useState, type FormEvent } from "react"
import { HeartPulse } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useHealthCheckIn } from "@/hooks/features/useHealthCheckIn"
import type { HealthCheckInInput } from "@/types/agenda"

type HealthCheckInDialogProps = {
  onCreated?: () => void | Promise<void>
}

export function HealthCheckInDialog({ onCreated }: HealthCheckInDialogProps) {
  const [open, setOpen] = useState(false)
  const [waterMl, setWaterMl] = useState("")
  const [painLevel, setPainLevel] = useState("")
  const [mood, setMood] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [notes, setNotes] = useState("")
  const { create, loading, error } = useHealthCheckIn()

  const empty = !waterMl && !painLevel && !mood && !symptoms.trim() && !notes.trim()

  const reset = () => {
    setWaterMl("")
    setPainLevel("")
    setMood("")
    setSymptoms("")
    setNotes("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (empty) return

    const input: HealthCheckInInput = {
      ...(waterMl ? { waterMl: Number(waterMl) } : {}),
      ...(painLevel ? { painLevel: Number(painLevel) } : {}),
      ...(mood ? { mood: Number(mood) } : {}),
      ...(symptoms.trim() ? { symptoms: symptoms.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }

    try {
      await create(input)
      await onCreated?.()
      toast.success("Check-in salvo")
      reset()
      setOpen(false)
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Não foi possível salvar o check-in.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto">
          <HeartPulse aria-hidden="true" />
          Check-in de saúde
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Check-in de saúde</DialogTitle>
            <DialogDescription>
              Registre apenas o que fizer sentido hoje. Todos os campos são opcionais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="waterMl">Água consumida (ml)</Label>
              <Input
                id="waterMl"
                name="waterMl"
                type="number"
                min={0}
                max={20000}
                value={waterMl}
                onChange={(event) => setWaterMl(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="painLevel">Dor (0 a 10)</Label>
              <Input
                id="painLevel"
                name="painLevel"
                type="number"
                min={0}
                max={10}
                value={painLevel}
                onChange={(event) => setPainLevel(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mood">Humor</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger id="mood" className="min-h-11 w-full">
                <SelectValue placeholder="Selecione de 1 a 5" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="symptoms">Sintomas</Label>
            <Textarea
              id="symptoms"
              name="symptoms"
              maxLength={2000}
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              maxLength={4000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={empty || loading}>
              {loading ? "Salvando..." : "Salvar check-in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
