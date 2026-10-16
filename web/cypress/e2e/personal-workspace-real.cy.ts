function loginWithCredentials(sessionKey: string, email: string) {
  cy.session([sessionKey, email], () => {
    cy.visit("/auth/login")
    cy.findByLabelText("E-mail").type(email)
    cy.findByLabelText("Senha").type("SafeMove-E2E-2026!", { log: false })
    cy.findByRole("button", { name: "Entrar" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/home")
  })

  cy.visit("/home")
  cy.location("pathname", { timeout: 20_000 }).should("eq", "/home")
}

describe("SafeMove Personal workspace and student record over real HTTP", () => {
  it("completes the real Personal journey, preserves historical workout IDs, enforces archive lock, and isolates Personal B", () => {
    cy.loginAs("PERSONAL")

    cy.findByRole("heading", { name: "Área de treinamento" }).should("be.visible")
    cy.findByRole("navigation", { name: "Navegação principal" }).within(() => {
      cy.findByRole("link", { name: "Treinos" }).should("be.visible")
      cy.contains(/planos alimentares|alimentos|reabilitação/i).should("not.exist")
    })

    cy.findByText("Sua base começa aqui").should("be.visible")
    cy.findByText("Cadastrar aluno → Registrar avaliação → Criar treino").should("be.visible")
    cy.findByRole("button", { name: "Nova prescrição" }).should("be.disabled")

    cy.findByRole("link", { name: "Novo aluno" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/clientes/novo")

    cy.findByLabelText("Nome completo").type("Aluno Jornada Personal")
    cy.findByLabelText("Objetivo principal").type("Força e hipertrofia")
    cy.findByLabelText("Anotações profissionais").type("Anotação privada sigilosa do personal")
    cy.findByRole("button", { name: "Salvar aluno" }).click()

    cy.location("pathname", { timeout: 20_000 }).should("eq", "/clientes")
    cy.findByRole("link", { name: "Abrir prontuário de Aluno Jornada Personal" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("match", /^\/clientes\/[0-9a-f-]+$/i)

    cy.location("pathname").then((studentPath) => {
      const clientId = studentPath.replace("/clientes/", "")

      cy.findByRole("region", { name: "Área de Treinamento" }).should("be.visible")
      cy.contains(/em migração/i).should("not.exist")
      cy.findByText("Nenhum treino ativo registrado").should("be.visible")
      cy.findByText("Nenhuma avaliação registrada").should("be.visible")

      cy.findByRole("button", { name: "Nova avaliação física" }).click()
      cy.findByRole("dialog", { name: "Nova avaliação física" }).within(() => {
        cy.findByLabelText(/Massa muscular/i).should("not.exist")
        cy.findByLabelText(/VO₂/i).should("not.exist")
        cy.findByLabelText("Agachamento 1RM informado (kg)").type("115")
        cy.findByLabelText("Observações").type("Execução controlada sem compensação lombar")
        cy.findByRole("button", { name: "Salvar avaliação física" }).click()
      })

      cy.findByRole("dialog", { name: "Nova avaliação física" }).should("not.exist")
      cy.findByRole("region", { name: "Avaliação mais recente" }).within(() => {
        cy.findByText("115 kg").should("be.visible")
        cy.contains("dt", "Peso").parent().should("contain.text", "Não registrado")
      })

      cy.findAllByRole("link", { name: "Criar prescrição" }).first().click()
      cy.location("pathname", { timeout: 20_000 }).should("eq", `/clientes/${clientId}/novo-treino`)

      cy.findByLabelText("Título da prescrição").should("have.value", "")
      cy.findByDisplayValue("Supino Reto com Barra").should("not.exist")

      cy.findByLabelText("Título da prescrição").type("Ficha Base Força A")
      cy.findByLabelText("Objetivo principal").type("Ganho de força máxima")
      cy.findByLabelText("Duração (semanas)").type("8")
      cy.findByLabelText("Foco da divisão").type("Inferiores e cadeia posterior")
      cy.findByRole("button", { name: "Adicionar exercício" }).click()
      cy.findByLabelText("Nome do exercício").type("Agachamento Livre")
      cy.findByLabelText("Séries").type("4")
      cy.findByLabelText("Repetições").type("6")
      cy.findByLabelText("Descanso").type("120s")
      cy.findByLabelText("Observações do exercício").type("Manter brace firme")
      cy.findByRole("textbox", { name: "Orientações gerais" }).type(
        "Aquecer mobilidade de quadril antes da primeira série",
      )
      cy.findByRole("button", { name: "Salvar prescrição" }).click()

      cy.location("pathname", { timeout: 20_000 }).should("eq", studentPath)
      cy.findByRole("heading", { name: "Ficha Base Força A" }).should("be.visible")

      cy.findByRole("link", { name: "Ver ficha" })
        .should("have.attr", "href")
        .then((firstWorkoutHref) => {
          const firstWorkoutPath = String(firstWorkoutHref)
          expect(firstWorkoutPath).to.match(new RegExp(`^/clientes/${clientId}/treinos/[0-9a-f-]+$`, "i"))

          cy.findByRole("link", { name: "Criar prescrição" }).click()
          cy.location("pathname", { timeout: 20_000 }).should("eq", `/clientes/${clientId}/novo-treino`)
          cy.findByLabelText("Título da prescrição").should("have.value", "")
          cy.contains("Salvar esta nova prescrição substituirá o treino ativo").should("be.visible")

          cy.findByRole("button", { name: "Usar treino atual como base" }).click()
          cy.findByLabelText("Título da prescrição").should("have.value", "Ficha Base Força A")
          cy.findByDisplayValue("Agachamento Livre").should("be.visible")

          cy.findByLabelText("Título da prescrição").clear().type("Ficha Evolução Força B")
          cy.findByRole("textbox", { name: "Orientações gerais" })
            .clear()
            .type("Progredir carga na última série")
          cy.findByRole("button", { name: "Salvar prescrição" }).click()

          cy.location("pathname", { timeout: 20_000 }).should("eq", studentPath)
          cy.findByRole("heading", { name: "Ficha Evolução Força B" }).should("be.visible")

          cy.findByRole("link", { name: "Ver ficha" })
            .should("have.attr", "href")
            .then((secondWorkoutHref) => {
              const secondWorkoutPath = String(secondWorkoutHref)
              expect(secondWorkoutPath).to.match(new RegExp(`^/clientes/${clientId}/treinos/[0-9a-f-]+$`, "i"))
              expect(secondWorkoutPath).not.to.eq(firstWorkoutPath)

              cy.visit("/treinos")
              cy.contains("li", "Ficha Base Força A").within(() => {
                cy.findByText("Treino anterior").should("be.visible")
                cy.findByRole("button", { name: "Abrir ficha" }).click()
              })

              cy.location("pathname", { timeout: 20_000 }).should("eq", firstWorkoutPath)
              cy.findByRole("heading", { name: "Ficha Base Força A" }).should("be.visible")
              cy.contains("Treino anterior").should("be.visible")
              cy.findByText("Agachamento Livre").should("be.visible")
              cy.contains("Anotação privada sigilosa do personal").should("not.exist")

              cy.visit("/treinos")
              cy.contains("li", "Ficha Evolução Força B").within(() => {
                cy.findByText("Treino ativo").should("be.visible")
                cy.findByRole("button", { name: "Abrir ficha" }).click()
              })

              cy.location("pathname", { timeout: 20_000 }).should("eq", secondWorkoutPath)
              cy.findByRole("heading", { name: "Ficha Evolução Força B" }).should("be.visible")
              cy.contains("Treino ativo").should("be.visible")
              cy.findByText("Progredir carga na última série").should("be.visible")

              cy.visit("/agenda")
              cy.findByRole("button", { name: /novo atendimento/i }).click()
              cy.findByRole("combobox", { name: "Aluno" }).click()
              cy.findByRole("option", { name: "Aluno Jornada Personal" }).click()
              cy.findByLabelText("Início")
                .invoke("val")
                .then((startVal) => {
                  const datePrefix = String(startVal).slice(0, 10)
                  cy.findByLabelText("Início").clear().type(`${datePrefix}T23:00`)
                  cy.findByLabelText("Fim").clear().type(`${datePrefix}T23:45`)
                })
              cy.findByRole("button", { name: "Agendar atendimento" }).click()
              cy.findByText("Atendimento agendado com sucesso.").should("be.visible")

              cy.visit("/home")
              cy.findByRole("region", { name: "Compromissos de hoje" }).within(() => {
                cy.findByRole("link", { name: "Aluno Jornada Personal" }).should("be.visible")
              })
              cy.findByRole("region", { name: "Resumo da base" }).within(() => {
                cy.contains("dt", "Alunos ativos").parent().should("contain.text", "1")
                cy.contains("dt", "Alunos sem treino ativo").parent().should("contain.text", "0")
              })

              cy.window().then((browserWindow) => {
                const persisted = [browserWindow.localStorage, browserWindow.sessionStorage]
                  .flatMap((storage) =>
                    Array.from({ length: storage.length }, (_, index) => {
                      const key = storage.key(index)
                      return key === null ? "" : `${key}=${storage.getItem(key)}`
                    }),
                  )
                  .join("\n")

                expect(persisted).not.to.match(
                  /access_token|refresh_token|csrf|Aluno Jornada Personal|Ficha Base Força A|Ficha Evolução Força B|Agachamento Livre|Anotação privada sigilosa/i,
                )
              })

              cy.visit(studentPath)
              cy.findByRole("button", { name: /arquivar aluno aluno jornada personal/i }).click()
              cy.findByRole("button", { name: "Confirmar arquivamento" }).click()
              cy.location("pathname", { timeout: 20_000 }).should("eq", "/clientes")

              cy.visit(studentPath)
              cy.findByText(
                "Prontuário arquivado: o histórico permanece disponível para consulta. Novas avaliações e prescrições estão bloqueadas.",
              ).should("be.visible")
              cy.findByRole("button", { name: "Nova avaliação física" }).should("be.disabled")
              cy.findByRole("button", { name: "Criar prescrição" }).should("be.disabled")

              cy.findByRole("link", { name: "Ver ficha" }).click()
              cy.location("pathname", { timeout: 20_000 }).should("eq", secondWorkoutPath)
              cy.findByRole("button", { name: "Criar prescrição" }).should("be.disabled")
              cy.findByRole("button", { name: "Imprimir ficha salva" }).should("be.enabled")

              // Respect the production 60 req/min per IP ThrottlerGuard window before switching tenants.
              cy.wait(61_000)
              loginWithCredentials("personal-p1-tenant-b", "personal-b.phase1@e2e.test")
              cy.findByRole("link", { name: /abrir prontuário de aluno exclusivo personal b/i }).should("be.visible")
              cy.contains("Aluno Jornada Personal").should("not.exist")

              cy.visit("/treinos")
              cy.findByText("Ficha Exclusiva Personal B").should("be.visible")
              cy.contains("Ficha Base Força A").should("not.exist")
              cy.contains("Ficha Evolução Força B").should("not.exist")

              cy.visit(studentPath, { failOnStatusCode: false })
              cy.findByRole("heading", { name: "Prontuário não encontrado" }).should("be.visible")
              cy.contains("Aluno Jornada Personal").should("not.exist")

              cy.visit(secondWorkoutPath, { failOnStatusCode: false })
              cy.findByRole("heading", { name: "Ficha de treino indisponível" }).should("be.visible")
              cy.contains("Ficha Evolução Força B").should("not.exist")
            })
        })
    })
  })
})
