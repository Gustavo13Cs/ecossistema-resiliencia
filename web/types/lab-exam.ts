export type MarkerCategory =
  | "GLYCEMIC"
  | "LIPID"
  | "THYROID"
  | "HEMATOLOGY"
  | "VITAMINS_MINERALS"
  | "HEPATIC_RENAL"
  | "INFLAMMATORY"
  | "HORMONAL"

export type MarkerStatus = "OPTIMAL" | "BORDERLINE" | "ALERT"

export interface MarkerReference {
  name: string
  category: MarkerCategory
  unit: string
  min?: number
  max?: number
  optimalMin?: number
  optimalMax?: number
  interpretation: string
}

export interface ConsolidatedLabMarker {
  id: string
  name: string
  value: number
  unit: string
  status: MarkerStatus
  reference: MarkerReference | null
}

export interface AttachedPdf {
  name: string
  sizeBytes: number
  uploadedAt: string
  url?: string
}

export interface ConsolidatedLabExam {
  id: string
  clientId: string
  clientName: string
  date: string
  notes?: string | null
  laboratoryName?: string
  markers: ConsolidatedLabMarker[]
  pdfAttachment?: AttachedPdf | null
  hasAlerts: boolean
  createdAt: string
}

export interface LabOrderTemplate {
  id: string
  title: string
  description: string
  category: string
  suggestedMarkers: string[]
}

export interface IssuedLabOrder {
  id: string
  clientId: string
  clientName: string
  issuedAt: string
  templateTitle?: string
  markers: string[]
  clinicalIndication: string
  preparationInstructions: string
}

export interface LabExamsKpi {
  totalExams: number
  clientsWithExamsCount: number
  clientsCoveragePercent: number
  alteredMarkersCount: number
  ordersIssuedCount: number
}

// Dicionário de Valores de Referência Clínicos Padronizados (SBPC/ML & Sociedades Brasileiras)
export const CLINICAL_MARKERS_DICTIONARY: Record<string, MarkerReference> = {
  // Glicemia & Metabólico
  "Glicemia de Jejum": {
    name: "Glicemia de Jejum",
    category: "GLYCEMIC",
    unit: "mg/dL",
    min: 70,
    max: 99,
    optimalMin: 75,
    optimalMax: 88,
    interpretation: "Alvo ideal: 75-88 mg/dL. Entre 100-125 indica pré-diabetes.",
  },
  "Hemoglobina Glicada (HbA1c)": {
    name: "Hemoglobina Glicada (HbA1c)",
    category: "GLYCEMIC",
    unit: "%",
    min: 4.0,
    max: 5.6,
    optimalMin: 4.5,
    optimalMax: 5.2,
    interpretation: "Alvo ideal: < 5.3%. Entre 5.7-6.4% indica risco aumentado.",
  },
  "Insulina Basal": {
    name: "Insulina Basal",
    category: "GLYCEMIC",
    unit: "uUI/mL",
    min: 2.0,
    max: 12.0,
    optimalMin: 3.0,
    optimalMax: 7.0,
    interpretation: "Alvo ótimo de sensibilidade insulínica: < 7.0 uUI/mL.",
  },
  "HOMA-IR": {
    name: "HOMA-IR",
    category: "GLYCEMIC",
    unit: "índice",
    min: 0.5,
    max: 2.15,
    optimalMin: 0.7,
    optimalMax: 1.5,
    interpretation: "Índice de resistência insulínica. Ideal: < 1.5.",
  },

  // Perfil Lipídico
  "Colesterol Total": {
    name: "Colesterol Total",
    category: "LIPID",
    unit: "mg/dL",
    min: 120,
    max: 190,
    optimalMin: 140,
    optimalMax: 180,
    interpretation: "Desejável < 190 mg/dL para adultos.",
  },
  "HDL Colesterol": {
    name: "HDL Colesterol",
    category: "LIPID",
    unit: "mg/dL",
    min: 40,
    max: 90,
    optimalMin: 50,
    optimalMax: 80,
    interpretation: "Fração protetora. Desejável > 40 (masc) e > 50 (fem).",
  },
  "LDL Colesterol": {
    name: "LDL Colesterol",
    category: "LIPID",
    unit: "mg/dL",
    min: 50,
    max: 130,
    optimalMin: 60,
    optimalMax: 100,
    interpretation: "Ótimo < 100 mg/dL (ou < 70 em alto risco cardiovascular).",
  },
  "Triglicerídeos": {
    name: "Triglicerídeos",
    category: "LIPID",
    unit: "mg/dL",
    min: 40,
    max: 150,
    optimalMin: 50,
    optimalMax: 100,
    interpretation: "Desejável < 150 mg/dL com jejum.",
  },

  // Tireoide
  "TSH": {
    name: "TSH",
    category: "THYROID",
    unit: "mUI/L",
    min: 0.4,
    max: 4.5,
    optimalMin: 1.0,
    optimalMax: 2.5,
    interpretation: "Faixa funcional ideal: 1.0 - 2.5 mUI/L.",
  },
  "TSH Ultra Sensível": {
    name: "TSH Ultra Sensível",
    category: "THYROID",
    unit: "µUI/mL",
    min: 0.4,
    max: 4.5,
    optimalMin: 1.0,
    optimalMax: 2.5,
    interpretation: "Faixa funcional ideal: 1.0 - 2.5 µUI/mL.",
  },
  "T4 Livre": {
    name: "T4 Livre",
    category: "THYROID",
    unit: "ng/dL",
    min: 0.8,
    max: 1.8,
    optimalMin: 1.0,
    optimalMax: 1.5,
    interpretation: "Hormônio tireoidiano ativo circulante.",
  },

  // Vitaminas & Minerais
  "Vitamina D (25-OH)": {
    name: "Vitamina D (25-OH)",
    category: "VITAMINS_MINERALS",
    unit: "ng/mL",
    min: 20,
    max: 100,
    optimalMin: 35,
    optimalMax: 60,
    interpretation: "Alvo clínico e imunológico ótimo: 35 a 60 ng/mL.",
  },
  "25-OH Vitamina D": {
    name: "25-OH Vitamina D",
    category: "VITAMINS_MINERALS",
    unit: "ng/mL",
    min: 20,
    max: 100,
    optimalMin: 35,
    optimalMax: 60,
    interpretation: "Alvo clínico e imunológico ótimo: 35 a 60 ng/mL.",
  },
  "Vitamina B12": {
    name: "Vitamina B12",
    category: "VITAMINS_MINERALS",
    unit: "pg/mL",
    min: 200,
    max: 900,
    optimalMin: 450,
    optimalMax: 850,
    interpretation: "Alvo funcional neurológico: > 450 pg/mL.",
  },
  "Ferritina": {
    name: "Ferritina",
    category: "VITAMINS_MINERALS",
    unit: "ng/mL",
    min: 30,
    max: 300,
    optimalMin: 50,
    optimalMax: 150,
    interpretation: "Estoque de ferro corporal. Ideal: 50 a 150 ng/mL.",
  },

  // Inflamatório & Hepático / Renal
  "PCR Ultrassensível": {
    name: "PCR Ultrassensível",
    category: "INFLAMMATORY",
    unit: "mg/L",
    min: 0,
    max: 3.0,
    optimalMin: 0,
    optimalMax: 1.0,
    interpretation: "Marcador de inflamação subclínica. Baixo risco < 1.0 mg/L.",
  },
  "Creatinina": {
    name: "Creatinina",
    category: "HEPATIC_RENAL",
    unit: "mg/dL",
    min: 0.6,
    max: 1.3,
    optimalMin: 0.7,
    optimalMax: 1.1,
    interpretation: "Marcador de função de filtração renal.",
  },
  "TGO (AST)": {
    name: "TGO (AST)",
    category: "HEPATIC_RENAL",
    unit: "U/L",
    min: 10,
    max: 40,
    optimalMin: 12,
    optimalMax: 28,
    interpretation: "Enzima hepática e muscular.",
  },
  "TGP (ALT)": {
    name: "TGP (ALT)",
    category: "HEPATIC_RENAL",
    unit: "U/L",
    min: 10,
    max: 40,
    optimalMin: 12,
    optimalMax: 28,
    interpretation: "Marcador específico de integridade dos hepatócitos.",
  },
}

export function evaluateMarkerValue(name: string, value: number): MarkerStatus {
  const ref = CLINICAL_MARKERS_DICTIONARY[name]
  if (!ref) return "OPTIMAL"

  // Check alert (outside min / max)
  if (ref.min !== undefined && value < ref.min) return "ALERT"
  if (ref.max !== undefined && value > ref.max) return "ALERT"

  // Check borderline (between limit and optimal)
  if (ref.optimalMin !== undefined && value < ref.optimalMin) return "BORDERLINE"
  if (ref.optimalMax !== undefined && value > ref.optimalMax) return "BORDERLINE"

  return "OPTIMAL"
}

export const PRESET_ORDER_TEMPLATES: LabOrderTemplate[] = [
  {
    id: "routine_metabolic",
    title: "Check-up Bioquímico & Metabólico de Rotina",
    description: "Painel completo para rastreamento de saúde metabólica, lipídica e deficiências nutricionais.",
    category: "Rotina Nutricional",
    suggestedMarkers: [
      "Hemograma Completo",
      "Glicemia de Jejum",
      "Insulina Basal",
      "Hemoglobina Glicada (HbA1c)",
      "Colesterol Total",
      "HDL Colesterol",
      "LDL Colesterol",
      "Triglicerídeos",
      "TSH",
      "T4 Livre",
      "Creatinina",
      "TGO (AST)",
      "TGP (ALT)",
      "Vitamina D (25-OH)",
      "Vitamina B12",
      "Ferritina",
    ],
  },
  {
    id: "weight_loss_resistance",
    title: "Painel de Emagrecimento & Resistência à Insulina",
    description: "Foco em metabolismo de carboidratos, perfil lipídico e marcadores inflamatórios.",
    category: "Emagrecimento",
    suggestedMarkers: [
      "Glicemia de Jejum",
      "Insulina Basal",
      "Hemoglobina Glicada (HbA1c)",
      "HOMA-IR",
      "Colesterol Total",
      "HDL Colesterol",
      "LDL Colesterol",
      "Triglicerídeos",
      "Ácido Úrico",
      "PCR Ultrassensível",
      "TGO (AST)",
      "TGP (ALT)",
      "TSH",
    ],
  },
  {
    id: "hypertrophy_performance",
    title: "Painel de Hipertrofia & Performance Esportiva",
    description: "Avaliação do eixo hormonal, integridade muscular, renal e suporte anabólico.",
    category: "Performance",
    suggestedMarkers: [
      "Hemograma Completo",
      "Testosterona Total",
      "Testosterona Livre",
      "Estradiol",
      "Cortisol Sérico",
      "Creatinina",
      "Ureia",
      "CPK (Creatina Fosfoquinase)",
      "Ferritina",
      "Vitamina D (25-OH)",
      "Vitamina B12",
      "Magnésio Sérico",
    ],
  },
  {
    id: "thyroid_immunity",
    title: "Painel Tireoidiano & Imunidade",
    description: "Investigação detalhada de fadiga crônica, função tireoidiana e micronutrientes.",
    category: "Tireoide & Imunidade",
    suggestedMarkers: [
      "TSH",
      "T4 Livre",
      "T3 Livre",
      "Anti-TPO",
      "Vitamina D (25-OH)",
      "Vitamina B12",
      "Zinco Sérico",
      "Selênio",
      "Ferritina",
      "PCR Ultrassensível",
    ],
  },
]

export const LAB_ORDER_TEMPLATES = PRESET_ORDER_TEMPLATES

export interface ClientOption {
  id: string
  name: string
}
