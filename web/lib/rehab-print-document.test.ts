import { describe, expect, it } from "vitest"
import type { RehabPlan } from "@/hooks/features/useFisio"
import {
  buildRehabClinicalProtocolPrintHtml,
  buildRehabHomeProgramPrintHtml,
} from "./rehab-print-document"

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html")

const approvedSvgUrl =
  "https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg"

function makePlan(overrides: Partial<RehabPlan> = {}): RehabPlan {
  return {
    id: "plan-1",
    title: "Lombalgia Mecânica & Core",
    goal: "Estabilidade lombo-pélvica",
    durationWeeks: 8,
    currentPhaseIndex: 1,
    notes: "Caminhar 15 minutos por dia.\nEvitar torções bruscas.",
    sessions: [
      {
        id: "s-1",
        name: "Fase 1 - Analgesia",
        focus: "Controle de dor",
        position: 0,
        estimatedWeeks: 2,
        progressionCriteria: "EVA <= 3 em repouso",
        exercises: [
          {
            id: "e-electro",
            name: "TENS Lombar Interno",
            category: "ELECTROTHERAPY",
            sets: "20 min",
            reps: "Contínuo",
            notes: "ANOTACAO_CLINICA_INTERNA_ELETRO",
            isHomeExercise: true, // mesmo se marcada por engano, eletro não vaza
            modalityParams: {
              modality: "TENS_SEGREDO_CLINICO",
              frequency: "80 Hz",
              pulseWidth: "100 µs",
              durationMinutes: 20,
              applicationSite: "L3-S1",
            },
          },
        ],
      },
      {
        id: "s-2",
        name: "Fase 2 - Controle Motor",
        focus: "Estabilização lombar",
        position: 1,
        estimatedWeeks: 6,
        progressionCriteria: "Execução sem hiperextensão lombar",
        exercises: [
          {
            id: "e-home-img",
            name: "Dead bug",
            category: "KINESIOTHERAPY",
            sets: "3",
            reps: "10 alternadas",
            notes: "ANOTACAO_CLINICA_PRIVADA_DO_FISIO",
            isHomeExercise: true,
            homeFrequency: "1x ao dia",
            patientInstructions:
              "Deite-se de costas e estenda braço e perna opostos lentamente.",
            catalogExerciseId: "cat-core-10",
            demonstrationSnapshot: {
              revision: "2026-10-19.1:1",
              instruction: "Instrução de catálogo fallback",
              assets: [
                {
                  id: "workout-guide-dead-bug-frame-1",
                  type: "IMAGE",
                  url: approvedSvgUrl,
                  alt: "Ilustração Dead bug",
                  sourcePageUrl:
                    "https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg",
                  author: "Bryl Lim / Workout Guide",
                  licenseName: "CC BY-SA 4.0",
                  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
                  displayAllowed: true,
                },
              ],
            },
          },
          {
            id: "e-home-fallback",
            name: "Perdigueiro",
            category: "KINESIOTHERAPY",
            sets: "3",
            reps: "8 por lado",
            notes: "NAO_MOSTRAR_AO_PACIENTE",
            isHomeExercise: true,
            homeFrequency: "3x na semana",
            catalogExerciseId: "cat-core-11",
            demonstrationSnapshot: {
              revision: "2026-10-19.1:1",
              instruction: "Em quatro apoios, estenda braço e perna opostos.",
              assets: [
                {
                  id: "untrusted",
                  type: "IMAGE",
                  url: "https://evil.example/evil.svg",
                  alt: "Imagem não autorizada",
                  sourcePageUrl: "https://evil.example/src",
                  author: "Unknown",
                  licenseName: "Unknown",
                  licenseUrl: "https://evil.example/lic",
                  displayAllowed: true,
                },
              ],
            },
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe("rehab typographic A4 print documents", () => {
  it.each([
    "<script>alert(1)</script>",
    '<svg onload="alert(2)">',
    "</style><img src=x onerror=alert(3)>",
    'quotes " & \' plus\nsecond line',
  ])("escapes untrusted strings in both print modes: %s", attack => {
    const plan = makePlan({
      title: attack,
      goal: attack,
      notes: attack,
      sessions: [
        {
          id: "s-attack",
          name: attack,
          focus: attack,
          progressionCriteria: attack,
          exercises: [
            {
              id: "e-attack",
              name: attack,
              sets: attack,
              reps: attack,
              notes: attack,
              category: "KINESIOTHERAPY",
              isHomeExercise: true,
              homeFrequency: attack,
              patientInstructions: attack,
            },
          ],
        },
      ],
    })

    for (const html of [
      buildRehabHomeProgramPrintHtml({
        plan,
        patientName: attack,
        professionalName: attack,
        professionalCredential: attack,
        dateLabel: attack,
      }),
      buildRehabClinicalProtocolPrintHtml({
        plan,
        patientName: attack,
        professionalName: attack,
        professionalCredential: attack,
        dateLabel: attack,
      }),
    ]) {
      expect(html).not.toContain("<script")
      const doc = parse(html)
      expect(doc.querySelector("script,svg,[onload],[onerror]")).toBeNull()
      expect(doc.querySelector("img")).toBeNull()
      expect(doc.querySelector(".patient-name")?.textContent).toBe(attack)
      expect(doc.querySelector(".professional-line")?.textContent).toContain(attack)
      expect(doc.querySelector("title")?.textContent).toContain(attack)
    }
  })

  it("renders visual home program with approved SVGs, credits, and strict clinical privacy", () => {
    const html = buildRehabHomeProgramPrintHtml({
      plan: makePlan(),
      patientName: "Marina Souza",
      professionalName: "Dr. Rafael Lima",
      professionalCredential: "CREFITO-3 998877-F",
      dateLabel: "24 de novembro de 2026",
    })
    const doc = parse(html)

    expect(doc.querySelector(".doc-title")?.textContent).toBe(
      "Cartilha de Exercícios para Casa",
    )
    expect(doc.querySelector(".professional-line")?.textContent).toBe(
      "Fisioterapeuta: Dr. Rafael Lima · CREFITO-3 998877-F",
    )

    // Ilustração aprovada com referrerPolicy, sem loading="lazy" e sem URLs maliciosas
    const imgs = Array.from(doc.querySelectorAll("img"))
    expect(imgs).toHaveLength(1)
    expect(imgs[0]?.getAttribute("src")).toBe(approvedSvgUrl)
    expect(imgs[0]?.getAttribute("referrerpolicy")).toBe("no-referrer")
    expect(imgs[0]?.getAttribute("loading")).toBeNull()
    expect(doc.body.innerHTML).not.toContain("https://evil.example/evil.svg")

    // Créditos CC BY-SA 4.0 e instruções
    expect(doc.body.textContent).toContain("Bryl Lim / Workout Guide")
    expect(doc.body.textContent).toContain("CC BY-SA 4.0")
    expect(doc.body.textContent).toContain("1x ao dia")
    expect(doc.body.textContent).toContain(
      "Deite-se de costas e estenda braço e perna opostos lentamente.",
    )
    expect(doc.body.textContent).toContain(
      "Em quatro apoios, estenda braço e perna opostos.",
    )
    expect(doc.body.textContent).toContain("Sinais de alerta:")
    expect(doc.querySelector(".general-notes p")?.innerHTML).toBe(
      "Caminhar 15 minutos por dia.<br>Evitar torções bruscas.",
    )

    // Privacidade estrita: notas clínicas internas e eletroterapia omitidas
    expect(doc.body.textContent).not.toContain("ANOTACAO_CLINICA_PRIVADA_DO_FISIO")
    expect(doc.body.textContent).not.toContain("NAO_MOSTRAR_AO_PACIENTE")
    expect(doc.body.textContent).not.toContain("ANOTACAO_CLINICA_INTERNA_ELETRO")
    expect(doc.body.textContent).not.toContain("TENS_SEGREDO_CLINICO")
  })

  it("renders clinical protocol mode with progression criteria, current phase, and modality params", () => {
    const html = buildRehabClinicalProtocolPrintHtml({
      plan: makePlan(),
      patientName: "Marina Souza",
      professionalName: "Dr. Rafael Lima",
      professionalCredential: "CREFITO-3 998877-F",
      dateLabel: "24 de novembro de 2026",
    })
    const doc = parse(html)

    expect(doc.querySelector(".doc-title")?.textContent).toBe(
      "Protocolo Completo de Reabilitação",
    )
    expect(doc.body.textContent).toContain("Fase atual")
    expect(doc.body.textContent).toContain("EVA <= 3 em repouso")
    expect(doc.body.textContent).toContain("TENS_SEGREDO_CLINICO")
    expect(doc.body.textContent).toContain("80 Hz")
    expect(doc.body.textContent).toContain("100 µs")
    expect(doc.body.textContent).toContain("ANOTACAO_CLINICA_PRIVADA_DO_FISIO")
  })
})
