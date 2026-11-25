"use client"

import { useMemo, useState } from "react"
import { Plus, Save, Stethoscope, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { BodyPainMapEditor } from "@/components/features/physio/BodyPainMapEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import {
  GONIOMETRY_CATALOG,
  MRC_GRADES,
  MUSCLE_GROUPS_CATALOG,
  ORTHOPEDIC_TESTS_BY_REGION,
  SIDE_LABELS,
  TEST_RESULT_LABELS,
  TEST_SIDE_LABELS,
} from "@/lib/physio-exam-catalog"
import type {
  AnatomicalSide,
  BodyPainMapEntry,
  GoniometryEntry,
  MuscleStrengthEntry,
  OrthopedicTestItem,
  OrthopedicTestResult,
  OrthopedicTestSide,
} from "@/types/physio"

interface PhysioAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  onSuccess: () => void
}

const DEFAULT_JOINT = "Joelho"
const DEFAULT_MOVEMENT = GONIOMETRY_CATALOG[DEFAULT_JOINT][0].movement
const DEFAULT_REF = GONIOMETRY_CATALOG[DEFAULT_JOINT][0].referenceDeg
const DEFAULT_TEST_REGION = "Joelho"
const DEFAULT_TEST_NAME = ORTHOPEDIC_TESTS_BY_REGION[DEFAULT_TEST_REGION][0]

export function PhysioAssessmentModal({
  isOpen,
  onClose,
  clientId,
  onSuccess,
}: PhysioAssessmentModalProps) {
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    chiefComplaint: "",
    historyOfIllness: "",
    painLevel: "",
    posturalAnalysis: "",
    palpation: "",
    jointMobility: "",
    orthopedicTests: "",
    treatmentPlan: "",
  })

  // Structured clinical exam state
  const [bodyPainMap, setBodyPainMap] = useState<BodyPainMapEntry[]>([])
  const [goniometry, setGoniometry] = useState<GoniometryEntry[]>([])
  const [muscleStrength, setMuscleStrength] = useState<MuscleStrengthEntry[]>([])
  const [orthopedicTestItems, setOrthopedicTestItems] = useState<
    OrthopedicTestItem[]
  >([])

  // Builders
  const [romJoint, setRomJoint] = useState(DEFAULT_JOINT)
  const [romMovement, setRomMovement] = useState(DEFAULT_MOVEMENT)
  const [romSide, setRomSide] = useState<AnatomicalSide>("RIGHT")
  const [romActive, setRomActive] = useState("")
  const [romPassive, setRomPassive] = useState("")
  const [romReference, setRomReference] = useState(String(DEFAULT_REF))

  const [mrcGroup, setMrcGroup] = useState(MUSCLE_GROUPS_CATALOG[12])
  const [mrcCustomGroup, setMrcCustomGroup] = useState("")
  const [mrcSide, setMrcSide] = useState<AnatomicalSide>("RIGHT")
  const [mrcGrade, setMrcGrade] = useState("4")
  const [mrcPainOnResistance, setMrcPainOnResistance] = useState(false)

  const [testRegion, setTestRegion] = useState(DEFAULT_TEST_REGION)
  const [testName, setTestName] = useState(DEFAULT_TEST_NAME)
  const [customTestName, setCustomTestName] = useState("")
  const [testSide, setTestSide] = useState<OrthopedicTestSide>("RIGHT")

  const availableMovements = useMemo(
    () => GONIOMETRY_CATALOG[romJoint] ?? [],
    [romJoint],
  )

  const availableTests = useMemo(
    () => ORTHOPEDIC_TESTS_BY_REGION[testRegion] ?? [],
    [testRegion],
  )

  const bilateralRomAlerts = useMemo(() => {
    const byKey = new Map<
      string,
      { left?: number; right?: number; joint: string; movement: string }
    >()
    for (const item of goniometry) {
      if (item.side === "AXIAL") continue
      const deg = item.activeDeg ?? item.passiveDeg
      if (deg == null) continue
      const key = `${item.joint}::${item.movement}`
      const bucket = byKey.get(key) ?? {
        joint: item.joint,
        movement: item.movement,
      }
      if (item.side === "LEFT") bucket.left = deg
      if (item.side === "RIGHT") bucket.right = deg
      byKey.set(key, bucket)
    }
    const alerts: string[] = []
    for (const pair of byKey.values()) {
      if (pair.left != null && pair.right != null) {
        const diff = Math.abs(pair.left - pair.right)
        if (diff >= 10) {
          alerts.push(
            `Assimetria em ${pair.joint} (${pair.movement}): Direito ${pair.right}° vs Esquerdo ${pair.left}° (diferença de ${diff}°).`,
          )
        }
      }
    }
    return alerts
  }, [goniometry])

  if (!isOpen) return null

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleJointChange = (nextJoint: string) => {
    setRomJoint(nextJoint)
    const first = GONIOMETRY_CATALOG[nextJoint]?.[0]
    if (first) {
      setRomMovement(first.movement)
      setRomReference(String(first.referenceDeg))
    }
  }

  const handleMovementChange = (nextMovement: string) => {
    setRomMovement(nextMovement)
    const found = availableMovements.find((m) => m.movement === nextMovement)
    if (found) {
      setRomReference(String(found.referenceDeg))
    }
  }

  const addGoniometryEntry = () => {
    const activeVal = romActive.trim() ? Number(romActive) : null
    const passiveVal = romPassive.trim() ? Number(romPassive) : null
    if (activeVal == null && passiveVal == null) {
      toast.error("Informe graus ativos ou passivos para adicionar a ADM.")
      return
    }
    if (
      (activeVal != null && (!Number.isFinite(activeVal) || activeVal < 0 || activeVal > 360)) ||
      (passiveVal != null && (!Number.isFinite(passiveVal) || passiveVal < 0 || passiveVal > 360))
    ) {
      toast.error("Os graus de ADM devem estar entre 0 e 360.")
      return
    }
    const refVal = romReference.trim() ? Number(romReference) : null
    setGoniometry((prev) => [
      ...prev,
      {
        joint: romJoint,
        movement: romMovement,
        side: romSide,
        activeDeg: activeVal,
        passiveDeg: passiveVal,
        referenceDeg: Number.isFinite(refVal) ? refVal : null,
      },
    ])
    setRomActive("")
    setRomPassive("")
  }

  const addMuscleStrengthEntry = () => {
    const label = mrcCustomGroup.trim() || mrcGroup
    if (!label) return
    const gradeNum = Number(mrcGrade)
    if (!Number.isInteger(gradeNum) || gradeNum < 0 || gradeNum > 5) return
    setMuscleStrength((prev) => [
      ...prev,
      {
        muscleGroup: label,
        side: mrcSide,
        grade: gradeNum,
        painOnResistance: mrcPainOnResistance,
      },
    ])
    setMrcCustomGroup("")
    setMrcPainOnResistance(false)
  }

  const handleTestRegionChange = (nextRegion: string) => {
    setTestRegion(nextRegion)
    const first = ORTHOPEDIC_TESTS_BY_REGION[nextRegion]?.[0]
    if (first) setTestName(first)
  }

  const addOrthopedicTest = (result: OrthopedicTestResult) => {
    const name = customTestName.trim() || testName
    if (!name) return
    setOrthopedicTestItems((prev) => [
      ...prev,
      {
        region: testRegion,
        testName: name,
        side: testSide,
        result,
      },
    ])
    setCustomTestName("")
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        clientId,
        ...formData,
        painLevel: formData.painLevel ? Number(formData.painLevel) : null,
        ...(bodyPainMap.length > 0 ? { bodyPainMap } : {}),
        ...(goniometry.length > 0 ? { goniometry } : {}),
        ...(muscleStrength.length > 0 ? { muscleStrength } : {}),
        ...(orthopedicTestItems.length > 0 ? { orthopedicTestItems } : {}),
      }

      await api.post("/physio-assessments", payload)
      toast.success("Avaliação Fisioterapêutica salva!")
      onSuccess()
      onClose()
    } catch {
      toast.error("Erro ao salvar avaliação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="physio-assessment-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between bg-purple-600 p-5 text-white">
          <div>
            <h2
              id="physio-assessment-modal-title"
              className="flex items-center gap-2 text-xl font-bold"
            >
              <Stethoscope className="h-5 w-5" /> Avaliação Fisioterapêutica
            </h2>
            <p className="text-sm opacity-90">
              Registro clínico, mapa de dor e exame cinésio-funcional estruturado.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar avaliação fisioterapêutica"
            onClick={onClose}
            className="rounded-full text-white hover:bg-purple-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="custom-scrollbar max-h-[75vh] overflow-y-auto p-6">
          <Tabs defaultValue="anamnese" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2 gap-1 bg-slate-100 p-1 sm:grid-cols-4">
              <TabsTrigger
                value="anamnese"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
              >
                Anamnese & Dor
              </TabsTrigger>
              <TabsTrigger
                value="adm-forca"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
              >
                ADM & Força
              </TabsTrigger>
              <TabsTrigger
                value="testes-exame"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
              >
                Testes & Exame
              </TabsTrigger>
              <TabsTrigger
                value="conduta"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
              >
                Plano & Conduta
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: ANAMNESE E MAPA DE DOR */}
            <TabsContent
              value="anamnese"
              className="space-y-4 animate-in fade-in duration-300"
            >
              <div className="space-y-5 rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="physio-chief-complaint"
                    className="font-bold text-slate-700"
                  >
                    Queixa Principal (QP) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="physio-chief-complaint"
                    value={formData.chiefComplaint}
                    onChange={(e) =>
                      handleChange("chiefComplaint", e.target.value)
                    }
                    placeholder="Ex: Dor no joelho direito ao subir escadas"
                    className="bg-white font-medium"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="physio-hma"
                    className="font-bold text-slate-700"
                  >
                    História da Moléstia Atual (HMA)
                  </Label>
                  <textarea
                    id="physio-hma"
                    value={formData.historyOfIllness}
                    onChange={(e) =>
                      handleChange("historyOfIllness", e.target.value)
                    }
                    className="min-h-[90px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Descreva como e quando os sintomas começaram..."
                  />
                </div>
                <div className="w-full space-y-2 sm:w-1/3">
                  <Label
                    htmlFor="physio-eva-geral"
                    className="flex items-center gap-2 font-bold text-slate-700"
                  >
                    Escala de Dor (EVA){" "}
                    <span className="text-xs font-normal text-slate-400">
                      0 a 10
                    </span>
                  </Label>
                  <Input
                    id="physio-eva-geral"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.painLevel}
                    onChange={(e) => handleChange("painLevel", e.target.value)}
                    className="bg-white text-lg font-bold text-rose-500"
                    placeholder="Ex: 7"
                  />
                </div>
              </div>

              <BodyPainMapEditor
                entries={bodyPainMap}
                onChange={setBodyPainMap}
              />
            </TabsContent>

            {/* ABA 2: GONIOMETRIA E FORÇA MUSCULAR MRC */}
            <TabsContent
              value="adm-forca"
              className="space-y-5 animate-in fade-in duration-300"
            >
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Goniometria Numérica (ADM)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registre ângulos ativos e passivos por articulação e compare assimetria bilateral.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="rom-joint" className="text-xs font-bold">
                      Articulação
                    </Label>
                    <select
                      id="rom-joint"
                      value={romJoint}
                      onChange={(e) => handleJointChange(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {Object.keys(GONIOMETRY_CATALOG).map((joint) => (
                        <option key={joint} value={joint}>
                          {joint}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rom-movement" className="text-xs font-bold">
                      Movimento
                    </Label>
                    <select
                      id="rom-movement"
                      value={romMovement}
                      onChange={(e) => handleMovementChange(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {availableMovements.map((m) => (
                        <option key={m.movement} value={m.movement}>
                          {m.movement} (ref. {m.referenceDeg}°)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rom-side" className="text-xs font-bold">
                      Lado
                    </Label>
                    <select
                      id="rom-side"
                      value={romSide}
                      onChange={(e) =>
                        setRomSide(e.target.value as AnatomicalSide)
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="RIGHT">Direito</option>
                      <option value="LEFT">Esquerdo</option>
                      <option value="AXIAL">Axial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor="rom-active" className="text-xs font-bold">
                      ADM Ativa (°)
                    </Label>
                    <Input
                      id="rom-active"
                      type="number"
                      min={0}
                      max={360}
                      placeholder="Ex: 110"
                      value={romActive}
                      onChange={(e) => setRomActive(e.target.value)}
                      className="h-10 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rom-passive" className="text-xs font-bold">
                      ADM Passiva (°)
                    </Label>
                    <Input
                      id="rom-passive"
                      type="number"
                      min={0}
                      max={360}
                      placeholder="Ex: 120"
                      value={romPassive}
                      onChange={(e) => setRomPassive(e.target.value)}
                      className="h-10 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rom-ref" className="text-xs font-bold">
                      Referência (°)
                    </Label>
                    <Input
                      id="rom-ref"
                      type="number"
                      min={0}
                      max={360}
                      value={romReference}
                      onChange={(e) => setRomReference(e.target.value)}
                      className="h-10 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 font-bold"
                    onClick={addGoniometryEntry}
                  >
                    <Plus className="mr-1 size-4" /> Adicionar ADM
                  </Button>
                </div>

                {bilateralRomAlerts.length > 0 ? (
                  <div
                    role="status"
                    className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-950"
                  >
                    {bilateralRomAlerts.map((msg) => (
                      <p key={msg}>{msg}</p>
                    ))}
                  </div>
                ) : null}

                {goniometry.length > 0 ? (
                  <ul
                    aria-label="Medições de goniometria adicionadas"
                    className="space-y-2"
                  >
                    {goniometry.map((item, idx) => (
                      <li
                        key={`${item.joint}:${item.movement}:${item.side}:${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-800">
                            {item.joint} — {item.movement}
                          </span>{" "}
                          <span className="text-xs font-semibold text-purple-700">
                            ({SIDE_LABELS[item.side]})
                          </span>
                          <p className="text-xs text-slate-600">
                            {item.activeDeg != null
                              ? `Ativa: ${item.activeDeg}°`
                              : "Ativa: —"}
                            {" · "}
                            {item.passiveDeg != null
                              ? `Passiva: ${item.passiveDeg}°`
                              : "Passiva: —"}
                            {item.referenceDeg != null
                              ? ` · Ref.: ${item.referenceDeg}°`
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ADM ${item.joint} ${item.movement}`}
                          onClick={() =>
                            setGoniometry((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Força Muscular (Escala MRC 0 a 5)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registre força muscular por grupamento, lado e dor à resistência.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="mrc-group" className="text-xs font-bold">
                      Grupamento muscular
                    </Label>
                    <select
                      id="mrc-group"
                      value={mrcGroup}
                      onChange={(e) => setMrcGroup(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {MUSCLE_GROUPS_CATALOG.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="mrc-custom-group"
                      className="text-xs font-bold"
                    >
                      Ou digite outro grupamento (opcional)
                    </Label>
                    <Input
                      id="mrc-custom-group"
                      value={mrcCustomGroup}
                      onChange={(e) => setMrcCustomGroup(e.target.value)}
                      placeholder="Ex: Fibulares"
                      className="h-10 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
                  <div className="space-y-1">
                    <Label htmlFor="mrc-side" className="text-xs font-bold">
                      Lado
                    </Label>
                    <select
                      id="mrc-side"
                      value={mrcSide}
                      onChange={(e) =>
                        setMrcSide(e.target.value as AnatomicalSide)
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="RIGHT">Direito</option>
                      <option value="LEFT">Esquerdo</option>
                      <option value="AXIAL">Axial</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mrc-grade" className="text-xs font-bold">
                      Grau MRC (0–5)
                    </Label>
                    <select
                      id="mrc-grade"
                      value={mrcGrade}
                      onChange={(e) => setMrcGrade(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {MRC_GRADES.map((g) => (
                        <option key={g.grade} value={String(g.grade)}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 font-bold"
                    onClick={addMuscleStrengthEntry}
                  >
                    <Plus className="mr-1 size-4" /> Adicionar força
                  </Button>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={mrcPainOnResistance}
                    onChange={(e) => setMrcPainOnResistance(e.target.checked)}
                    className="size-4 rounded border-slate-300"
                  />
                  Dor provocada durante resistência isométrica
                </label>

                {muscleStrength.length > 0 ? (
                  <ul
                    aria-label="Medições de força muscular adicionadas"
                    className="space-y-2"
                  >
                    {muscleStrength.map((item, idx) => (
                      <li
                        key={`${item.muscleGroup}:${item.side}:${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-800">
                            {item.muscleGroup}
                          </span>{" "}
                          <span className="text-xs font-semibold text-purple-700">
                            ({SIDE_LABELS[item.side]})
                          </span>
                          <p className="text-xs text-slate-600">
                            Grau {item.grade}/5
                            {item.painOnResistance ? " · Dor à resistência" : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover força ${item.muscleGroup}`}
                          onClick={() =>
                            setMuscleStrength((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <Label
                  htmlFor="physio-joint-mobility-notes"
                  className="font-bold text-slate-700"
                >
                  Observações gerais de mobilidade articular (ADM)
                </Label>
                <textarea
                  id="physio-joint-mobility-notes"
                  value={formData.jointMobility}
                  onChange={(e) =>
                    handleChange("jointMobility", e.target.value)
                  }
                  className="min-h-[70px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Sensação final (end-feel), crepitações, compensações..."
                />
              </div>
            </TabsContent>

            {/* ABA 3: TESTES ESPECIAIS, POSTURA E PALPAÇÃO */}
            <TabsContent
              value="testes-exame"
              className="space-y-5 animate-in fade-in duration-300"
            >
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Testes Especiais / Ortopédicos por Região
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione região, teste e clique diretamente no resultado observado.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="test-region" className="text-xs font-bold">
                      Região
                    </Label>
                    <select
                      id="test-region"
                      value={testRegion}
                      onChange={(e) => handleTestRegionChange(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {Object.keys(ORTHOPEDIC_TESTS_BY_REGION).map((reg) => (
                        <option key={reg} value={reg}>
                          {reg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="test-name" className="text-xs font-bold">
                      Teste especial
                    </Label>
                    <select
                      id="test-name"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      {availableTests.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="test-side" className="text-xs font-bold">
                      Lado
                    </Label>
                    <select
                      id="test-side"
                      value={testSide}
                      onChange={(e) =>
                        setTestSide(e.target.value as OrthopedicTestSide)
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="RIGHT">Direito</option>
                      <option value="LEFT">Esquerdo</option>
                      <option value="BILATERAL">Bilateral</option>
                      <option value="AXIAL">Axial</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1 space-y-1">
                    <Label
                      htmlFor="test-custom-name"
                      className="text-xs font-bold"
                    >
                      Ou outro teste (opcional)
                    </Label>
                    <Input
                      id="test-custom-name"
                      value={customTestName}
                      onChange={(e) => setCustomTestName(e.target.value)}
                      placeholder="Ex: Pivot Shift"
                      className="h-10 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addOrthopedicTest("POSITIVE")}
                    className="h-10 border-rose-300 bg-rose-50 font-bold text-rose-700 hover:bg-rose-100"
                  >
                    + Positivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addOrthopedicTest("NEGATIVE")}
                    className="h-10 border-emerald-300 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    - Negativo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addOrthopedicTest("INCONCLUSIVE")}
                    className="h-10 font-semibold text-slate-700"
                  >
                    Inconclusivo
                  </Button>
                </div>

                {orthopedicTestItems.length > 0 ? (
                  <ul
                    aria-label="Testes especiais registrados"
                    className="space-y-2"
                  >
                    {orthopedicTestItems.map((item, idx) => (
                      <li
                        key={`${item.region}:${item.testName}:${item.side}:${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {item.testName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.region} · {TEST_SIDE_LABELS[item.side]}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              item.result === "POSITIVE"
                                ? "bg-rose-100 text-rose-800"
                                : item.result === "NEGATIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {TEST_RESULT_LABELS[item.result]}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover teste ${item.testName}`}
                          onClick={() =>
                            setOrthopedicTestItems((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="physio-postural"
                    className="font-bold text-slate-700"
                  >
                    Análise Postural
                  </Label>
                  <textarea
                    id="physio-postural"
                    value={formData.posturalAnalysis}
                    onChange={(e) =>
                      handleChange("posturalAnalysis", e.target.value)
                    }
                    className="min-h-[90px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Ex: Ombro direito elevado, anteriorização de cabeça..."
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="physio-palpation"
                    className="font-bold text-slate-700"
                  >
                    Palpação
                  </Label>
                  <textarea
                    id="physio-palpation"
                    value={formData.palpation}
                    onChange={(e) => handleChange("palpation", e.target.value)}
                    className="min-h-[90px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Ex: Tensão em trapézio superior, ponto gatilho..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label
                    htmlFor="physio-tests-notes"
                    className="font-bold text-slate-700"
                  >
                    Notas adicionais dos testes ortopédicos
                  </Label>
                  <textarea
                    id="physio-tests-notes"
                    value={formData.orthopedicTests}
                    onChange={(e) =>
                      handleChange("orthopedicTests", e.target.value)
                    }
                    className="min-h-[70px] w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Observações complementares..."
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: CONDUTA */}
            <TabsContent
              value="conduta"
              className="space-y-4 animate-in fade-in duration-300"
            >
              <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
                <Label
                  htmlFor="physio-treatment-plan"
                  className="font-bold text-slate-700"
                >
                  Plano de Tratamento / Conduta
                </Label>
                <textarea
                  id="physio-treatment-plan"
                  value={formData.treatmentPlan}
                  onChange={(e) =>
                    handleChange("treatmentPlan", e.target.value)
                  }
                  className="min-h-[150px] w-full resize-y rounded-lg border border-slate-200 bg-white p-4 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Descreva os objetivos do tratamento (Ex: 1. Controle da dor, 2. Ganho de ADM) e as técnicas a serem utilizadas..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-6 font-bold text-slate-600"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || !formData.chiefComplaint.trim()}
            className="h-11 bg-purple-600 px-8 font-bold text-white shadow-md hover:bg-purple-700"
          >
            <Save className="mr-2 h-4 w-4" />{" "}
            {loading ? "A Salvar..." : "Salvar Avaliação Fisioterapêutica"}
          </Button>
        </div>
      </div>
    </>
  )
}
