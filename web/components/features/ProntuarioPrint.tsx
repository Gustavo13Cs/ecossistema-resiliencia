"use client"

import React from "react"
import { PatientExportData } from "@/hooks/features/usePatientExport"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str?: string | null) {
  if (!str) return "—"
  return new Date(str).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtNum(v?: number | null, unit = "") {
  if (v == null) return "—"
  return `${v}${unit}`
}

// ─── Sub-componentes do documento ─────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "2px solid #0f172a", marginBottom: 10, paddingBottom: 4, marginTop: 24 }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f172a", margin: 0 }}>
        {children}
      </h2>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", minWidth: 160 }}>{label}:</span>
      <span style={{ fontSize: 10, color: "#1e293b" }}>{value ?? "—"}</span>
    </div>
  )
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <tr style={{ background: "#f1f5f9" }}>
      {cols.map((c, i) => (
        <th key={i} style={{ padding: "5px 8px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569", textAlign: "left", border: "1px solid #e2e8f0" }}>
          {c}
        </th>
      ))}
    </tr>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export const ProntuarioPrint = React.forwardRef<HTMLDivElement, { data: PatientExportData }>(
  ({ data }, ref) => {
    const { patient, activeDiet, activeWorkout, activeRehab, lastAssessment, lastLabExam, lastAnamnesis, exportedAt } = data

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: "#1e293b",
          padding: "32px 40px",
          maxWidth: 794,
          margin: "0 auto",
          background: "#fff",
        }}
      >
        {/* ════ CABEÇALHO ════ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #0f172a", paddingBottom: 14, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "#0f172a" }}>Ecossistema Resiliência</h1>
            <p style={{ fontSize: 10, color: "#64748b", margin: "2px 0 0" }}>Plataforma Multidisciplinar de Saúde e Performance</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: "#0f172a" }}>PRONTUÁRIO DO PACIENTE</p>
            <p style={{ fontSize: 9, color: "#94a3b8", margin: "2px 0 0" }}>Emitido em {fmtDate(exportedAt)}</p>
          </div>
        </div>

        {/* ════ 1. IDENTIFICAÇÃO ════ */}
        <SectionTitle>1. Identificação do Paciente</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
          <DataRow label="Nome Completo" value={patient.name} />
          <DataRow label="E-mail" value={patient.email} />
          <DataRow label="Telefone / WhatsApp" value={patient.phone} />
          <DataRow label="Data de Nascimento" value={fmtDate(patient.birthDate)} />
          <DataRow label="Gênero" value={patient.gender} />
          <DataRow label="Objetivo Principal" value={patient.goal} />
          <DataRow label="Altura" value={fmtNum(patient.height, " cm")} />
          <DataRow label="Peso Inicial" value={fmtNum(patient.initialWeight, " kg")} />
          <DataRow label="Alergias / Intolerâncias" value={patient.allergies} />
          <DataRow label="Patologias Diagnosticadas" value={patient.pathologies} />
          <DataRow label="Tipo de Exercício" value={patient.exerciseType} />
          <DataRow label="Frequência Semanal" value={patient.exerciseFrequency} />
        </div>

        {/* ════ 2. ANAMNESE ════ */}
        {lastAnamnesis && (
          <>
            <SectionTitle>2. Histórico Clínico (Anamnese)</SectionTitle>
            <DataRow label="Histórico Clínico" value={lastAnamnesis.clinicalHistory} />
            <DataRow label="Medicações em Uso" value={lastAnamnesis.medications} />
            <DataRow label="Patologias" value={lastAnamnesis.pathologies} />
            <DataRow label="Sintomas / Queixas" value={lastAnamnesis.symptoms} />
            <DataRow label="Histórico Familiar" value={lastAnamnesis.familyHistory} />
            <DataRow label="Hábito Intestinal" value={lastAnamnesis.bowelMovement} />
            <DataRow label="Consumo de Água" value={lastAnamnesis.waterIntake ? `${lastAnamnesis.waterIntake}L/dia` : null} />
            <DataRow label="Álcool / Tabagismo" value={lastAnamnesis.alcoholAndSmoking} />
          </>
        )}

        {/* ════ 3. AVALIAÇÃO FÍSICA ════ */}
        {lastAssessment && (
          <>
            <SectionTitle>3. Última Avaliação Física ({fmtDate(lastAssessment.date)})</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 32px" }}>
              <DataRow label="Peso" value={fmtNum(lastAssessment.weight, " kg")} />
              <DataRow label="% Gordura" value={fmtNum(lastAssessment.bodyFat, "%")} />
              <DataRow label="Massa Muscular" value={fmtNum(lastAssessment.muscleMass, " kg")} />
              <DataRow label="Cintura" value={fmtNum(lastAssessment.waist, " cm")} />
              <DataRow label="Abdômen" value={fmtNum(lastAssessment.abdomen, " cm")} />
              <DataRow label="Quadril" value={fmtNum(lastAssessment.hips, " cm")} />
              <DataRow label="Supino 1RM" value={fmtNum(lastAssessment.benchPress1RM, " kg")} />
              <DataRow label="Agachamento 1RM" value={fmtNum(lastAssessment.squat1RM, " kg")} />
            </div>
            {lastAssessment.notes && <DataRow label="Observações" value={lastAssessment.notes} />}
          </>
        )}

        {/* ════ 4. PLANO ALIMENTAR ════ */}
        {activeDiet && (
          <>
            <SectionTitle>4. Plano Alimentar Ativo — {activeDiet.title}</SectionTitle>
            {activeDiet.creator && <DataRow label="Prescrito por" value={`${activeDiet.creator.name}`} />}
            <DataRow label="Objetivo" value={activeDiet.goal} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0 16px", marginBottom: 10 }}>
              <DataRow label="Alvo Calórico" value={fmtNum(activeDiet.targetKcal, " kcal")} />
              <DataRow label="Proteína" value={fmtNum(activeDiet.proteinG, "g")} />
              <DataRow label="Carboidratos" value={fmtNum(activeDiet.carbsG, "g")} />
              <DataRow label="Gorduras" value={fmtNum(activeDiet.fatG, "g")} />
            </div>
            {activeDiet.meals.map((meal, idx) => (
              <div key={meal.id} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#0f766e", margin: "8px 0 4px" }}>
                  {idx + 1}. {meal.name}{meal.time ? ` — ${meal.time}` : ""}
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <TableHeader cols={["Alimento", "Quantidade", "Kcal", "Proteína", "Carbo", "Gordura"]} />
                  </thead>
                  <tbody>
                    {meal.items.map((item, i) => (
                      <tr key={item.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{item.food?.name ?? "—"}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{item.quantity} {item.measure}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{fmtNum(item.food?.kcal)}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{fmtNum(item.food?.protein, "g")}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{fmtNum(item.food?.carbs, "g")}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{fmtNum(item.food?.fat, "g")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}

        {/* ════ 5. PLANO DE TREINO ════ */}
        {activeWorkout && (
          <>
            <SectionTitle>5. Plano de Treino Ativo — {activeWorkout.title}</SectionTitle>
            {activeWorkout.creator && <DataRow label="Prescrito por" value={activeWorkout.creator.name} />}
            <DataRow label="Objetivo" value={activeWorkout.goal} />
            <DataRow label="Duração" value={fmtNum(activeWorkout.durationWeeks, " semanas")} />
            {activeWorkout.splits.map((split, idx) => (
              <div key={split.id} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", margin: "8px 0 4px" }}>
                  {split.name}{split.focus ? ` — ${split.focus}` : ""}
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <TableHeader cols={["Exercício", "Séries", "Repetições", "Descanso", "Observações"]} />
                  </thead>
                  <tbody>
                    {split.exercises.map((ex, i) => (
                      <tr key={ex.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", fontWeight: 600 }}>{ex.name}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{ex.sets}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{ex.reps}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{ex.rest ?? "—"}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", color: "#64748b" }}>{ex.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}

        {/* ════ 6. PLANO DE REABILITAÇÃO ════ */}
        {activeRehab && (
          <>
            <SectionTitle>6. Plano de Reabilitação Ativo — {activeRehab.title}</SectionTitle>
            {activeRehab.creator && <DataRow label="Prescrito por" value={activeRehab.creator.name} />}
            <DataRow label="Objetivo" value={activeRehab.goal} />
            <DataRow label="Duração" value={fmtNum(activeRehab.durationWeeks, " semanas")} />
            {activeRehab.sessions.map((session) => (
              <div key={session.id} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", margin: "8px 0 4px" }}>
                  {session.name}{session.focus ? ` — ${session.focus}` : ""}
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                  <thead>
                    <TableHeader cols={["Exercício / Terapia", "Séries", "Repetições / Tempo", "Observações"]} />
                  </thead>
                  <tbody>
                    {session.exercises.map((ex, i) => (
                      <tr key={ex.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", fontWeight: 600 }}>{ex.name}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{ex.sets}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{ex.reps}</td>
                        <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", color: "#64748b" }}>{ex.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}

        {/* ════ 7. EXAMES LABORATORIAIS ════ */}
        {lastLabExam && (
          <>
            <SectionTitle>7. Último Exame Laboratorial ({fmtDate(lastLabExam.date)})</SectionTitle>
            {lastLabExam.notes && <DataRow label="Observações" value={lastLabExam.notes} />}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, marginTop: 8 }}>
              <thead>
                <TableHeader cols={["Marcador", "Valor", "Unidade"]} />
              </thead>
              <tbody>
                {lastLabExam.markers.map((m, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{m.value}</td>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", color: "#64748b" }}>{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ════ RODAPÉ ════ */}
        <div style={{ marginTop: 40, paddingTop: 12, borderTop: "1px solid #e2e8f0", textAlign: "center" }}>
          <p style={{ fontSize: 8, color: "#94a3b8", margin: 0 }}>
            Documento gerado pelo Ecossistema Resiliência em {fmtDate(exportedAt)} · Uso exclusivo profissional · Confidencial
          </p>
        </div>
      </div>
    )
  }
)

ProntuarioPrint.displayName = "ProntuarioPrint"
