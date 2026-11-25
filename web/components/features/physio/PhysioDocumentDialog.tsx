"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { FileText, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import {
  buildAttendanceCertificatePrintHtml,
  buildMedicalReferralReportPrintHtml,
  buildPhysioCertificatePrintHtml,
} from "@/lib/physio-documents-print"
import { openPrintWindow } from "@/lib/print-document"
import type {
  PhysioActivePlan,
  PhysioAssessmentRecord,
  PhysioDocumentType,
  PhysioEvolutionAppointmentSummary,
  PhysioFunctionalScaleRecord,
  PhysioSessionEvolution,
} from "@/types/physio"

interface PhysioDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  assessments: PhysioAssessmentRecord[]
  evolutions: PhysioSessionEvolution[]
  scales: PhysioFunctionalScaleRecord[]
  activePlan: PhysioActivePlan | null
  appointments: PhysioEvolutionAppointmentSummary[]
}

function formatIssueDate(now = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now)
}

function toTimeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function PhysioDocumentDialog({
  open,
  onOpenChange,
  clientName,
  assessments,
  evolutions,
  scales,
  activePlan,
  appointments,
}: PhysioDocumentDialogProps) {
  const { user } = useAuth()
  const idPrefix = useId()
  const [docType, setDocType] = useState<PhysioDocumentType>("ATTENDANCE")
  const [credential, setCredential] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [city, setCity] = useState("")
  const [popupBlocked, setPopupBlocked] = useState(false)

  // Declaração de Comparecimento
  const [attDateLabel, setAttDateLabel] = useState(() => formatIssueDate())
  const [startTime, setStartTime] = useState("14:00")
  const [endTime, setEndTime] = useState("15:00")
  const [companionName, setCompanionName] = useState("")
  const [attNotes, setAttNotes] = useState("")

  // Atestado Fisioterapêutico
  const [finding, setFinding] = useState("")
  const [activityRec, setActivityRec] = useState(
    "afastamento temporário de atividades físicas de impacto",
  )
  const [recDays, setRecDays] = useState("7")
  const [includeDiagnosis, setIncludeDiagnosis] = useState(false)
  const [diagnosisOrCid, setDiagnosisOrCid] = useState("")

  // Relatório Médico / Convênio
  const [recipient, setRecipient] = useState(
    "À Equipe Médica / Auditores de Convênio",
  )
  const [chiefComplaint, setChiefComplaint] = useState("")
  const [conductSummary, setConductSummary] = useState("")
  const [clinicalOpinion, setClinicalOpinion] = useState("")

  const initialAssessment = assessments[assessments.length - 1] ?? null
  const latestAssessment = assessments[0] ?? null

  const objectiveSummary = useMemo(() => {
    const parts: string[] = []
    if (latestAssessment?.goniometry?.length) {
      parts.push(
        `ADM recente: ${latestAssessment.goniometry
          .map(
            g =>
              `${g.joint} ${g.movement} (${g.activeDeg ?? g.passiveDeg ?? "—"}°)`,
          )
          .join("; ")}.`,
      )
    }
    if (scales.length > 0) {
      parts.push(
        `Escalas funcionais: ${scales
          .slice(0, 3)
          .map(
            s =>
              `${s.scaleType} = ${s.normalizedScore} (${s.classification})`,
          )
          .join("; ")}.`,
      )
    }
    return parts.join(" ")
  }, [latestAssessment, scales])

  useEffect(() => {
    if (!open) return
    setPopupBlocked(false)
    setAttDateLabel(formatIssueDate())
    setFinding(
      latestAssessment?.chiefComplaint
        ? `Alteração cinético-funcional relacionada a ${latestAssessment.chiefComplaint}.`
        : "Comprometimento cinético-funcional em tratamento reabilitativo.",
    )
    setChiefComplaint(latestAssessment?.chiefComplaint ?? "")
    const procedures = Array.from(
      new Set(evolutions.flatMap(e => e.proceduresApplied)),
    )
    const planLabel = activePlan
      ? `Protocolo "${activePlan.title}"${activePlan.goal ? ` (${activePlan.goal})` : ""}. `
      : ""
    setConductSummary(
      `${planLabel}${procedures.length ? `Recursos e condutas aplicadas: ${procedures.join(", ")}.` : "Cinesioterapia, analgesia e progressão funcional monitorada."}`,
    )
    setClinicalOpinion(
      "Paciente em acompanhamento fisioterapêutico regular com resposta clínica progressiva. Recomenda-se continuidade do plano terapêutico.",
    )
  }, [open, latestAssessment, evolutions, activePlan])

  if (!open || !user?.sub || user.role !== "PHYSIO") return null

  function handleQuickFillAppointment(apptId: string) {
    const found = appointments.find(a => a.id === apptId)
    if (!found) return
    const d = new Date(found.startsAt)
    if (!Number.isNaN(d.getTime())) {
      setAttDateLabel(formatIssueDate(d))
    }
    setStartTime(toTimeLabel(found.startsAt) || "14:00")
    setEndTime(toTimeLabel(found.endsAt) || "15:00")
  }

  function handlePrint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPopupBlocked(false)
    const issueDateLabel = formatIssueDate()

    let html = ""
    if (docType === "ATTENDANCE") {
      html = buildAttendanceCertificatePrintHtml({
        patientName: clientName,
        attendanceDateLabel: attDateLabel,
        startTime,
        endTime,
        companionName,
        clinicName,
        city,
        professionalName: user?.name ?? null,
        professionalCredential: credential,
        notes: attNotes,
        issueDateLabel,
      })
    } else if (docType === "CERTIFICATE") {
      html = buildPhysioCertificatePrintHtml({
        patientName: clientName,
        kineticFunctionalFinding: finding,
        activityRecommendation: activityRec,
        recommendationDays: recDays ? Number(recDays) : null,
        includeDiagnosisCode: includeDiagnosis,
        diagnosisOrCid,
        clinicName,
        city,
        professionalName: user?.name ?? null,
        professionalCredential: credential,
        issueDateLabel,
      })
    } else {
      const latestPain =
        evolutions[0]?.painAfter ??
        evolutions[0]?.painBefore ??
        latestAssessment?.painLevel ??
        null
      html = buildMedicalReferralReportPrintHtml({
        patientName: clientName,
        recipientName: recipient,
        chiefComplaint,
        initialPainLevel: initialAssessment?.painLevel ?? null,
        currentPainLevel: latestPain,
        sessionsCompleted: evolutions.length,
        romAndScalesSummary: objectiveSummary || null,
        conductSummary,
        clinicalOpinion,
        clinicName,
        city,
        professionalName: user?.name ?? null,
        professionalCredential: credential,
        issueDateLabel,
      })
    }

    const popup = openPrintWindow(html, "width=1024,height=780")
    if (!popup) {
      setPopupBlocked(true)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="print:hidden"
        className="print:hidden max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          Emitir Documento Fisioterapêutico (PDF A4)
        </DialogTitle>
        <DialogDescription>
          Gere declaração de comparecimento, atestado cinético-funcional ou relatório clínico para {clientName}.
        </DialogDescription>

        <form className="space-y-4 pt-1" onSubmit={handlePrint}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-crefito`} className="text-xs">
                CREFITO (recomendado)
              </Label>
              <Input
                id={`${idPrefix}-crefito`}
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="Ex: CREFITO-3 123456-F"
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-clinic`} className="text-xs">
                Clínica / Consultório
              </Label>
              <Input
                id={`${idPrefix}-clinic`}
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                placeholder="Opcional"
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-city`} className="text-xs">
                Cidade / UF
              </Label>
              <Input
                id={`${idPrefix}-city`}
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Ex: São Paulo - SP"
                className="min-h-10"
              />
            </div>
          </div>

          <Tabs
            value={docType}
            onValueChange={val => setDocType(val as PhysioDocumentType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ATTENDANCE">Comparecimento</TabsTrigger>
              <TabsTrigger value="CERTIFICATE">Atestado</TabsTrigger>
              <TabsTrigger value="MEDICAL_REPORT">
                Relatório Médico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ATTENDANCE" className="mt-3 space-y-3">
              {appointments.length > 0 ? (
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-appt`} className="text-xs">
                    Preencher rápido por atendimento
                  </Label>
                  <select
                    id={`${idPrefix}-appt`}
                    defaultValue=""
                    onChange={e => handleQuickFillAppointment(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-[var(--sm-border)] bg-background px-3 text-sm"
                  >
                    <option value="">Selecionar atendimento da agenda...</option>
                    {appointments.map(appt => (
                      <option key={appt.id} value={appt.id}>
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(appt.startsAt))}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-att-date`} className="text-xs">
                    Data do atendimento
                  </Label>
                  <Input
                    id={`${idPrefix}-att-date`}
                    value={attDateLabel}
                    onChange={e => setAttDateLabel(e.target.value)}
                    required={docType === "ATTENDANCE"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-att-start`} className="text-xs">
                    Hora inicial
                  </Label>
                  <Input
                    id={`${idPrefix}-att-start`}
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    required={docType === "ATTENDANCE"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-att-end`} className="text-xs">
                    Hora final
                  </Label>
                  <Input
                    id={`${idPrefix}-att-end`}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    required={docType === "ATTENDANCE"}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-comp`} className="text-xs">
                  Acompanhante (opcional)
                </Label>
                <Input
                  id={`${idPrefix}-comp`}
                  value={companionName}
                  onChange={e => setCompanionName(e.target.value)}
                  placeholder="Nome do acompanhante, se houver"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-att-notes`} className="text-xs">
                  Observações complementares (opcional)
                </Label>
                <textarea
                  id={`${idPrefix}-att-notes`}
                  rows={2}
                  value={attNotes}
                  onChange={e => setAttNotes(e.target.value)}
                  className="w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="CERTIFICATE" className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`${idPrefix}-act`} className="text-xs">
                    Recomendação funcional
                  </Label>
                  <Input
                    id={`${idPrefix}-act`}
                    value={activityRec}
                    onChange={e => setActivityRec(e.target.value)}
                    required={docType === "CERTIFICATE"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${idPrefix}-days`} className="text-xs">
                    Período (dias)
                  </Label>
                  <Input
                    id={`${idPrefix}-days`}
                    type="number"
                    min={1}
                    max={365}
                    value={recDays}
                    onChange={e => setRecDays(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-finding`} className="text-xs">
                  Parecer cinético-funcional
                </Label>
                <textarea
                  id={`${idPrefix}-finding`}
                  rows={3}
                  value={finding}
                  onChange={e => setFinding(e.target.value)}
                  required={docType === "CERTIFICATE"}
                  className="w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 rounded-md border border-[var(--sm-border)] p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={includeDiagnosis}
                    onChange={e => setIncludeDiagnosis(e.target.checked)}
                    className="h-4 w-4 accent-[var(--sm-brand)]"
                  />
                  <span>
                    Incluir código / diagnóstico mediante autorização expressa do paciente
                  </span>
                </label>
                {includeDiagnosis ? (
                  <Input
                    value={diagnosisOrCid}
                    onChange={e => setDiagnosisOrCid(e.target.value)}
                    placeholder="Ex: CIF b2801 / CID M54.5"
                    aria-label="Código ou diagnóstico autorizado"
                  />
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="MEDICAL_REPORT" className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-recp`} className="text-xs">
                  Destinatário
                </Label>
                <Input
                  id={`${idPrefix}-recp`}
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-cc`} className="text-xs">
                  Quadro clínico e queixa
                </Label>
                <textarea
                  id={`${idPrefix}-cc`}
                  rows={2}
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  className="w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-cond`} className="text-xs">
                  Condutas e recursos aplicados
                </Label>
                <textarea
                  id={`${idPrefix}-cond`}
                  rows={2}
                  value={conductSummary}
                  onChange={e => setConductSummary(e.target.value)}
                  required={docType === "MEDICAL_REPORT"}
                  className="w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-opin`} className="text-xs">
                  Evolução funcional e parecer / solicitação
                </Label>
                <textarea
                  id={`${idPrefix}-opin`}
                  rows={3}
                  value={clinicalOpinion}
                  onChange={e => setClinicalOpinion(e.target.value)}
                  required={docType === "MEDICAL_REPORT"}
                  className="w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          {popupBlocked ? (
            <p role="alert" className="rounded-md border border-amber-500 p-3 text-sm font-medium">
              O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11">
              <Printer className="mr-1.5 h-4 w-4" />
              Gerar PDF A4
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
