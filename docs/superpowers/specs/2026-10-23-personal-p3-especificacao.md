# SafeMove — Especificação Técnica P3 (Personal Trainer)
## Implementação dos 3 Pilares Científicos de Prescrição

> **Data de Emissão**: 23 de Outubro de 2026  
> **Status**: Proposta Executiva e Técnica Aprovada (Escopo Focado)  
> **Documento PDF Gerado**: [`docs/SafeMove_Personal_P3_Especificacao.pdf`](file:///c:/Users/MICRO/Documents/GitHub/ecossistema-resiliencia/docs/SafeMove_Personal_P3_Especificacao.pdf)

---

### Sumário Executivo

Com as fundações do **P1** (workspace clínico, prontuário individualizado e bloqueios transacionais) e do **P2** (parâmetros avançados de esforço RIR/RPE, cadência, métodos de treino e biblioteca com mais de 150 exercícios com RLS) consolidadas, esta especificação detalha com precisão cirúrgica os **3 pilares de prescrição de alta performance** selecionados para a **Fase P3**:

1. **Monitor de Volume Semanal por Grupo Muscular (*Volume Landmarks*)**
2. **Banco de Modelos e Templates de Treino Reutilizáveis**
3. **Periodização em Blocos e Progressão Programada de Esforço**

---

### 1. Monitor de Volume Semanal por Grupo Muscular (*Volume Landmarks*)

- **Fundamentação Científica**:
  O volume semanal de séries efetivas por músculo é o principal gatilho hipertrófico e de adaptação de força. Adotamos o modelo baseado em evidências (Schoenfeld, Helms, Israetel):
  - **MV (Maintenance Volume)**: 4 a 6 séries/sem (amarelo)
  - **MEV (Minimum Effective Volume)**: 8 a 12 séries/sem (azul)
  - **MAV (Maximum Adaptive Volume)**: 12 a 20 séries/sem (**faixa ideal / verde**)
  - **MRV (Maximum Recoverable Volume)**: 22 a 26+ séries/sem (alerta de fadiga excessiva / vermelho)
- **Experiência do Usuário (UI/UX)**:
  - Painel retrátil no `WorkoutEditor` e no `WorkoutReadView` calculando dinamicamente as séries semanais para cada um dos 15 grupos musculares.
  - Multiplicação automática pela frequência da divisão (ex: divisão A 2x na semana multiplica suas séries por 2).
  - Alerta visual caso haja desbalanceamento severo entre agonistas e antagonistas (ex: peitoral vs. cadeia posterior).
- **Engenharia**:
  - Cálculo 100% reativo no frontend (hook `useWeeklyVolumeSummary`), sem sobrecarga de banco de dados.

---

### 2. Banco de Modelos e Templates de Treino (*Template Bank*)

- **Conceito & UX**:
  - **Templates Globais SafeMove**: Estruturas clássicas pré-configuradas (Push/Pull/Legs 3x e 6x, Upper/Lower 4x, Fullbody 3x, Treino Adaptativo Iniciante, Hipertrofia Feminina).
  - **Templates Privados do Personal**: Possibilidade de salvar qualquer ficha de sucesso como modelo com 1 clique (*"Salvar como Modelo"*).
  - **Importação em 1 Clique**: No prontuário do aluno, o personal clica em *"Começar a partir de Modelo"*, escolhe o template e todo o treino é clonado com novos IDs, restando apenas calibrar cargas e repetições.
- **Engenharia & RLS**:
  - Nova tabela `workout_templates` no Prisma.
  - RLS estrito: personal só acessa seus próprios templates (`professional_id = auth.uid()`) e os templates oficiais SafeMove (`professional_id IS NULL`, somente-leitura).

---

### 3. Periodização em Blocos e Progressão Programada

- **Conceito de Mesociclo (4 a 12 semanas)**:
  - **Fase 1 (Semanas 1-2)**: Adaptação técnica e calibração de cargas (RIR 3-4 / RPE 6-7).
  - **Fase 2 (Semanas 3-4)**: Sobrecarga progressiva (+1-2 reps ou +2-5% de carga / RIR 2).
  - **Fase 3 (Semanas 5-6)**: Pico de esforço e intensidade (RIR 1-0 / RPE 9-10).
  - **Fase 4 (Semana 7 ou 8)**: Deload ativo programado (redução de 40% do volume para supercompensação regenerativa).
- **Experiência do Aluno e do Personal**:
  - Régua temporal com marcador de *"Semana Atual"*.
  - Indicação explícita na semana de Deload para evitar lesões por excesso de carga.

---

### Roteiro de Execução

| Etapa | Funcionalidade | Esforço | Impacto Técnico & Negócio |
|---|---|---|---|
| **Passo 1** | **Monitor de Volume Semanal (Landmarks)** | Baixo / Rápido | 100% frontend e tipagem. Não altera banco; gera impacto visual e valor científico imediato no editor e na ficha de leitura. |
| **Passo 2** | **Banco de Templates de Treino** | Médio | Criação da tabela `workout_templates` no Prisma com RLS, clonador de treino no backend e modal de importação rápida no frontend. |
| **Passo 3** | **Periodização em Blocos e Semanas** | Médio | Adição de campos de fase/mesociclo no DTO e régua visual de progresso por semana na visualização do aluno. |
