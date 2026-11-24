import type {
  AnatomicalSide,
  BodyPainSymptomType,
  BodyPainView,
  OrthopedicTestResult,
  OrthopedicTestSide,
} from "@/types/physio"

export interface BodyPainRegionDef {
  id: string
  label: string
  view: BodyPainView
  cx: number
  cy: number
  r: number
}

export const BODY_PAIN_REGIONS: readonly BodyPainRegionDef[] = [
  // Anterior (SVG viewBox 0 0 200 360)
  { id: "ant-cervical", label: "Cervical anterior", view: "ANTERIOR", cx: 100, cy: 58, r: 10 },
  { id: "ant-ombro-d", label: "Ombro direito", view: "ANTERIOR", cx: 62, cy: 84, r: 13 },
  { id: "ant-ombro-e", label: "Ombro esquerdo", view: "ANTERIOR", cx: 138, cy: 84, r: 13 },
  { id: "ant-peitoral", label: "Região peitoral", view: "ANTERIOR", cx: 100, cy: 96, r: 16 },
  { id: "ant-cotovelo-d", label: "Cotovelo direito", view: "ANTERIOR", cx: 52, cy: 134, r: 11 },
  { id: "ant-cotovelo-e", label: "Cotovelo esquerdo", view: "ANTERIOR", cx: 148, cy: 134, r: 11 },
  { id: "ant-abdomen", label: "Abdômen", view: "ANTERIOR", cx: 100, cy: 138, r: 16 },
  { id: "ant-punho-d", label: "Punho / Mão direita", view: "ANTERIOR", cx: 42, cy: 184, r: 11 },
  { id: "ant-punho-e", label: "Punho / Mão esquerda", view: "ANTERIOR", cx: 158, cy: 184, r: 11 },
  { id: "ant-quadril-d", label: "Quadril / Virilha direita", view: "ANTERIOR", cx: 78, cy: 174, r: 13 },
  { id: "ant-quadril-e", label: "Quadril / Virilha esquerda", view: "ANTERIOR", cx: 122, cy: 174, r: 13 },
  { id: "ant-coxa-d", label: "Coxa anterior direita", view: "ANTERIOR", cx: 80, cy: 215, r: 13 },
  { id: "ant-coxa-e", label: "Coxa anterior esquerda", view: "ANTERIOR", cx: 120, cy: 215, r: 13 },
  { id: "ant-joelho-d", label: "Joelho direito", view: "ANTERIOR", cx: 80, cy: 254, r: 12 },
  { id: "ant-joelho-e", label: "Joelho esquerdo", view: "ANTERIOR", cx: 120, cy: 254, r: 12 },
  { id: "ant-perna-d", label: "Perna anterior direita", view: "ANTERIOR", cx: 80, cy: 294, r: 11 },
  { id: "ant-perna-e", label: "Perna anterior esquerda", view: "ANTERIOR", cx: 120, cy: 294, r: 11 },
  { id: "ant-tornozelo-d", label: "Tornozelo / Pé direito", view: "ANTERIOR", cx: 80, cy: 334, r: 12 },
  { id: "ant-tornozelo-e", label: "Tornozelo / Pé esquerdo", view: "ANTERIOR", cx: 120, cy: 334, r: 12 },

  // Posterior (SVG viewBox 0 0 200 360)
  { id: "post-cervical", label: "Cervical posterior", view: "POSTERIOR", cx: 100, cy: 58, r: 11 },
  { id: "post-ombro-e", label: "Ombro posterior esquerdo", view: "POSTERIOR", cx: 62, cy: 84, r: 13 },
  { id: "post-ombro-d", label: "Ombro posterior direito", view: "POSTERIOR", cx: 138, cy: 84, r: 13 },
  { id: "post-toracica", label: "Coluna torácica", view: "POSTERIOR", cx: 100, cy: 102, r: 15 },
  { id: "post-lombar", label: "Coluna lombar", view: "POSTERIOR", cx: 100, cy: 142, r: 16 },
  { id: "post-gluteo-e", label: "Glúteo / Sacro esquerdo", view: "POSTERIOR", cx: 80, cy: 176, r: 13 },
  { id: "post-gluteo-d", label: "Glúteo / Sacro direito", view: "POSTERIOR", cx: 120, cy: 176, r: 13 },
  { id: "post-coxa-e", label: "Posterior de coxa esquerda", view: "POSTERIOR", cx: 80, cy: 218, r: 13 },
  { id: "post-coxa-d", label: "Posterior de coxa direita", view: "POSTERIOR", cx: 120, cy: 218, r: 13 },
  { id: "post-joelho-e", label: "Fossa poplítea esquerda", view: "POSTERIOR", cx: 80, cy: 254, r: 11 },
  { id: "post-joelho-d", label: "Fossa poplítea direita", view: "POSTERIOR", cx: 120, cy: 254, r: 11 },
  { id: "post-panturrilha-e", label: "Panturrilha esquerda", view: "POSTERIOR", cx: 80, cy: 294, r: 12 },
  { id: "post-panturrilha-d", label: "Panturrilha direita", view: "POSTERIOR", cx: 120, cy: 294, r: 12 },
  { id: "post-calcaneo-e", label: "Tendão calcâneo esquerdo", view: "POSTERIOR", cx: 80, cy: 334, r: 11 },
  { id: "post-calcaneo-d", label: "Tendão calcâneo direito", view: "POSTERIOR", cx: 120, cy: 334, r: 11 },
]

export const BODY_PAIN_SYMPTOM_LABELS: Record<BodyPainSymptomType, string> = {
  SHARP: "Pontada / Aguda",
  BURNING: "Queimação",
  RADIATING: "Irradiação",
  ACHING: "Peso / Dolorimento",
  STIFFNESS: "Rigidez",
  TINGLING: "Formigamento / Parestesia",
}

export const SIDE_LABELS: Record<AnatomicalSide, string> = {
  RIGHT: "Direito",
  LEFT: "Esquerdo",
  AXIAL: "Axial / Central",
}

export const TEST_SIDE_LABELS: Record<OrthopedicTestSide, string> = {
  RIGHT: "Direito",
  LEFT: "Esquerdo",
  BILATERAL: "Bilateral",
  AXIAL: "Axial / Central",
}

export const TEST_RESULT_LABELS: Record<OrthopedicTestResult, string> = {
  POSITIVE: "Positivo (+)",
  NEGATIVE: "Negativo (-)",
  INCONCLUSIVE: "Inconclusivo",
}

export interface JointMovementDef {
  movement: string
  referenceDeg: number
}

export const GONIOMETRY_CATALOG: Record<string, readonly JointMovementDef[]> = {
  Ombro: [
    { movement: "Flexão", referenceDeg: 180 },
    { movement: "Extensão", referenceDeg: 45 },
    { movement: "Abdução", referenceDeg: 180 },
    { movement: "Rotação externa", referenceDeg: 90 },
    { movement: "Rotação interna", referenceDeg: 70 },
  ],
  Cotovelo: [
    { movement: "Flexão", referenceDeg: 145 },
    { movement: "Extensão", referenceDeg: 0 },
    { movement: "Pronação", referenceDeg: 80 },
    { movement: "Supinação", referenceDeg: 85 },
  ],
  Punho: [
    { movement: "Flexão", referenceDeg: 80 },
    { movement: "Extensão", referenceDeg: 70 },
    { movement: "Desvio radial", referenceDeg: 20 },
    { movement: "Desvio ulnar", referenceDeg: 30 },
  ],
  "Coluna Cervical": [
    { movement: "Flexão", referenceDeg: 45 },
    { movement: "Extensão", referenceDeg: 45 },
    { movement: "Rotação", referenceDeg: 70 },
    { movement: "Inclinação lateral", referenceDeg: 45 },
  ],
  "Coluna Lombar": [
    { movement: "Flexão", referenceDeg: 60 },
    { movement: "Extensão", referenceDeg: 25 },
    { movement: "Inclinação lateral", referenceDeg: 25 },
  ],
  Quadril: [
    { movement: "Flexão", referenceDeg: 120 },
    { movement: "Extensão", referenceDeg: 30 },
    { movement: "Abdução", referenceDeg: 45 },
    { movement: "Adução", referenceDeg: 30 },
    { movement: "Rotação interna", referenceDeg: 35 },
    { movement: "Rotação externa", referenceDeg: 45 },
  ],
  Joelho: [
    { movement: "Flexão", referenceDeg: 140 },
    { movement: "Extensão", referenceDeg: 0 },
  ],
  Tornozelo: [
    { movement: "Dorsiflexão", referenceDeg: 20 },
    { movement: "Plantiflexão", referenceDeg: 50 },
    { movement: "Inversão", referenceDeg: 35 },
    { movement: "Eversão", referenceDeg: 20 },
  ],
}

export const MRC_GRADES: ReadonlyArray<{ grade: number; label: string }> = [
  { grade: 0, label: "0 — Nenhuma contração visível" },
  { grade: 1, label: "1 — Contração discreta sem movimento" },
  { grade: 2, label: "2 — Movimento ativo sem gravidade" },
  { grade: 3, label: "3 — Vence gravidade sem resistência" },
  { grade: 4, label: "4 — Vence gravidade e resistência moderada" },
  { grade: 5, label: "5 — Força muscular normal" },
]

export const MUSCLE_GROUPS_CATALOG: readonly string[] = [
  "Deltóide",
  "Manguito rotador (Rotadores externos)",
  "Manguito rotador (Subescapular)",
  "Bíceps braquial",
  "Tríceps braquial",
  "Extensores do punho",
  "Flexores do punho",
  "Paravertebrais",
  "Abdominais / Core",
  "Glúteo médio",
  "Glúteo máximo",
  "Iliopsoas",
  "Quadríceps",
  "Isquiotibiais",
  "Tibial anterior",
  "Tríceps sural (Panturrilha)",
]

export const ORTHOPEDIC_TESTS_BY_REGION: Record<string, readonly string[]> = {
  Joelho: [
    "Lachman",
    "Gaveta Anterior",
    "Gaveta Posterior",
    "McMurray",
    "Teste de Apley",
    "Teste de Clarke / Patelar",
    "Estresse em Valgo",
    "Estresse em Varo",
  ],
  Ombro: [
    "Neer",
    "Hawkins-Kennedy",
    "Jobe (Lata Vazia)",
    "Speed (Bicipital)",
    "Yergason",
    "Apreensão Anterior",
    "Gerber (Lift-off)",
  ],
  "Coluna Lombar": [
    "Lasègue (Elevação da Perna Reta)",
    "Slump Test",
    "Patrick / FABER",
    "Sinal de Kemp",
    "Gaenslen",
  ],
  "Coluna Cervical": [
    "Spurling",
    "Distração Cervical",
    "Teste de Adson",
    "ULTT (Tensão Neural MMSS)",
  ],
  Quadril: [
    "FADIR (Impacto Femoracetabular)",
    "Teste de Thomas",
    "Trendelenburg",
    "Teste de Ober",
  ],
  Tornozelo: [
    "Gaveta Anterior do Tornozelo",
    "Tilt Talar",
    "Teste de Thompson",
    "Squeeze Test (Sindesmose)",
  ],
  "Cotovelo / Punho": [
    "Phalen",
    "Sinal de Tinel no Punho",
    "Finkelstein",
    "Cozen (Epicondilite Lateral)",
    "Teste de Mill",
  ],
}
