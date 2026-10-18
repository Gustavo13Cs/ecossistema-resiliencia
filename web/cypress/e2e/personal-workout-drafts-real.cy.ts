import type { DraftContentV1, WorkoutDraftResource } from "../../types/workout-draft"

const apiUrl = "http://localhost:3000"
const password = "SafeMove-E2E-2026!"
const complete = (title: string): DraftContentV1 => ({
  title, goal: "Força", durationWeeks: 8, notes: "Orientação Task7 privada",
  splits: [{ name: "Treino A", focus: "Inferiores", exercises: [{
    name: "Agachamento Livre", sets: "3", reps: "8", rest: "60s", notes: "",
    muscleGroup: null, load: "", effortType: null, effortTarget: "", tempo: "", method: "STANDARD",
  }] }],
})

function request<T = WorkoutDraftResource>(method: string, path: string, body?: Cypress.RequestBody, failOnStatusCode = true) {
  return cy.getCookie("csrf_token").then(cookie => cy.request<T>({
    method, url: `${apiUrl}${path}`, body, failOnStatusCode,
    headers: { Origin: "http://localhost:3001", "X-CSRF-Token": cookie?.value ?? "" },
  }))
}

function newClient(label: string) {
  return request<{ id: string }>("POST", "/clients", { name: `Task7 ${label}` }).then(({ body }) => body.id)
}

function newDraft(clientId: string, title: string) {
  return request("POST", "/workouts/drafts", { clientId, content: complete(title) }).then(({ body }) => body)
}

function confirmFinalize() {
  cy.findByRole("button", { name: "Finalizar prescrição" }).click()
  cy.findByRole("alertdialog").within(() => cy.findByRole("button", { name: "Confirmar finalização" }).click())
}

function editorPath(clientId: string, draftId: string) { return `/clientes/${clientId}/rascunhos/${draftId}` }
function workoutPath(clientId: string, workoutId: string) { return `/clientes/${clientId}/treinos/${workoutId}` }

function assertNoStorage() {
  cy.window().then(window => {
    const stored = [window.localStorage, window.sessionStorage].flatMap(storage =>
      Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index)
        return key === null ? "" : `${key}=${storage.getItem(key)}`
      })).join("\n")
    expect(stored).not.to.match(/Task7|Agachamento|Orientação|access_token|refresh_token|csrf/i)
  })
}

describe("Personal drafts through real browser, HTTP, runtime roles and PostgreSQL", () => {
  before(() => cy.task("drafts:cleanup"))
  after(() => cy.task("drafts:cleanup"))
  beforeEach(() => cy.loginAs("PERSONAL"))

  it("saves an incomplete student draft, reloads, finalizes, revises and reads both immutable IDs; archive stays read-only", () => {
    cy.findByRole("link", { name: "Novo aluno" }).click()
    cy.findByLabelText("Nome completo").type("Task7 Jornada de rascunho")
    cy.findByRole("button", { name: "Salvar aluno" }).click()
    cy.findByRole("link", { name: "Abrir prontuário de Task7 Jornada de rascunho" }).click()
    cy.location("pathname").should("match", /^\/clientes\/[0-9a-f-]+$/).then(clientPath => {
      const clientId = clientPath.split("/")[2]
      cy.findAllByRole("link", { name: "Criar prescrição" }).first().click()
      cy.findByRole("heading", { name: "Nova elaboração de treino" }).should("be.visible")
      cy.findByRole("button", { name: "Começar do zero" }).click()
      cy.findByLabelText("Título da prescrição").should("have.value", "")
      cy.findByRole("button", { name: "Salvar rascunho" }).click()
      cy.location("pathname").should("match", /\/rascunhos\/[0-9a-f-]+$/)
      cy.location("pathname").then(draftPath => {
        const draftId = draftPath.split("/").at(-1)!
        request("GET", `/workouts/drafts/${draftId}`).then(({ body }) => {
          expect(body.status).eq("OPEN")
          expect(body.content?.title).eq("")
          expect(body.content?.splits[0].exercises).deep.eq([])
        })
        cy.reload()
        cy.findByLabelText("Título da prescrição").should("have.value", "").type("Task7 Ficha original")
        cy.findByLabelText("Objetivo").type("Força")
        cy.findByLabelText("Duração (semanas)").type("8")
        cy.findByRole("button", { name: "Adicionar exercício" }).click()
        cy.findByLabelText("Nome do exercício").type("Agachamento Livre")
        cy.findByLabelText("Séries").type("3")
        cy.findByLabelText("Repetições").type("8")
        cy.intercept("POST", `**/workouts/drafts/${draftId}/finalize`).as("finalized")
        confirmFinalize()
        cy.wait("@finalized").then(({ response }) => {
          expect(response?.statusCode).eq(201)
          const originalId = String(response?.body.finalizedWorkoutId)
          cy.location("pathname").should("eq", workoutPath(clientId, originalId))
          cy.findByRole("heading", { name: "Task7 Ficha original" }).should("be.visible")
          cy.contains("Finalizada em").should("be.visible")
          cy.intercept("POST", `**/workouts/drafts`).as("revision")
          cy.findByRole("button", { name: "Revisar esta ficha" }).click()
          cy.wait("@revision").then(({ request: sent, response: created }) => {
            expect(sent.body.sourceWorkoutId).eq(originalId)
            const revision = created?.body as WorkoutDraftResource
            cy.location("pathname").should("eq", editorPath(clientId, revision.id))
            cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Ficha original").clear().type("Task7 Ficha revisada")
            cy.intercept("POST", `**/workouts/drafts/${revision.id}/finalize`).as("revised")
            confirmFinalize()
            cy.wait("@revised").then(({ response: finalized }) => {
              const revisedId = String(finalized?.body.finalizedWorkoutId)
              expect(revisedId).not.eq(originalId)
              cy.location("pathname").should("eq", workoutPath(clientId, revisedId))
              cy.findByRole("link", { name: "Consultar ficha de origem" }).click()
              cy.location("pathname").should("eq", workoutPath(clientId, originalId))
              cy.findByRole("heading", { name: "Task7 Ficha original" }).should("be.visible")
              cy.findByText("Treino anterior").should("be.visible")
              cy.visit(workoutPath(clientId, revisedId))
              cy.findByRole("heading", { name: "Task7 Ficha revisada" }).should("be.visible")
              cy.findByText("Treino ativo").should("be.visible")
              newDraft(clientId, "Task7 Leitura arquivada").then(draft => {
                cy.visit(clientPath)
                cy.findByRole("button", { name: /arquivar aluno task7 jornada de rascunho/i }).click()
                cy.findByRole("button", { name: "Confirmar arquivamento" }).click()
                cy.visit(editorPath(clientId, draft.id))
                cy.findByText("Aluno arquivado. Rascunho disponível apenas para leitura.").should("be.visible")
                cy.findByLabelText("Título da prescrição").should("be.disabled")
                for (const name of ["Salvar rascunho", "Finalizar prescrição", "Descartar rascunho"]) cy.findByRole("button", { name }).should("be.disabled")
                request("PUT", `/workouts/drafts/${draft.id}`, { expectedVersion: draft.version, content: complete("bloqueado") }, false).its("status").should("eq", 409)
                assertNoStorage()
              })
            })
          })
        })
      })
    })
  })

  it("keeps dirty text after a committed save/finalize response is lost, recovers terminal IDs and rejects a wrong recovery version", () => {
    newClient("Resposta perdida").then(clientId => newDraft(clientId, "Task7 Antes da resposta").then(draft => {
      cy.visit(editorPath(clientId, draft.id))
      cy.findByLabelText("Título da prescrição").clear().type("Task7 Snapshot confirmado no servidor")
      // Injeta falha somente DEPOIS do serviço real confirmar a gravação.
      cy.intercept({ method: "PUT", url: `**/workouts/drafts/${draft.id}`, times: 1 }, sent => sent.continue(response => {
        expect(response.statusCode).eq(200)
        response.send({ statusCode: 503, body: { message: "Synthetic lost response after commit" } })
      })).as("lostSave")
      cy.findByRole("button", { name: "Salvar rascunho" }).click()
      cy.wait("@lostSave")
      cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Snapshot confirmado no servidor")
      cy.findByText("Alterações não salvas").should("be.visible")
      cy.findByRole("button", { name: "Voltar para aluno" }).click()
      cy.findByRole("alertdialog").within(() => cy.findByRole("button", { name: "Cancelar" }).click())
      request("GET", `/workouts/drafts/${draft.id}`).then(({ body: saved }) => {
        expect(saved.version).eq(draft.version + 1)
        expect(saved.content?.title).eq("Task7 Snapshot confirmado no servidor")
        cy.reload()
        cy.findByLabelText("Título da prescrição").should("have.value", saved.content!.title)
        cy.intercept({ method: "POST", url: `**/workouts/drafts/${draft.id}/finalize`, times: 1 }, sent => sent.continue(response => {
          expect(response.statusCode).eq(201)
          response.send({ statusCode: 503, body: { message: "Synthetic lost finalize response after commit" } })
        })).as("lostFinalize")
        confirmFinalize()
        cy.wait("@lostFinalize")
        cy.reload()
        cy.findByRole("heading", { name: "Prescrição finalizada" }).should("be.visible")
        cy.findByLabelText("Título da prescrição").should("not.exist")
        request("GET", `/workouts/drafts/${draft.id}`).then(({ body: terminal }) => {
          expect(terminal.status).eq("FINALIZED")
          expect(terminal.content).eq(null)
          request<{ finalizedWorkoutId: string }>("POST", `/workouts/drafts/${draft.id}/finalize`, { expectedVersion: saved.version }).then(({ body: retry }) => expect(retry.finalizedWorkoutId).eq(terminal.finalizedWorkoutId))
          request("POST", `/workouts/drafts/${draft.id}/finalize`, { expectedVersion: saved.version + 99 }, false).its("status").should("eq", 409)
          cy.findByRole("link", { name: "Abrir ficha finalizada" }).click()
          cy.location("pathname").should("eq", workoutPath(clientId, terminal.finalizedWorkoutId!))
          cy.findByRole("heading", { name: "Task7 Snapshot confirmado no servidor" }).should("be.visible")
          newDraft(clientId, "Task7 Descartado").then(discarded => {
            cy.visit(editorPath(clientId, discarded.id))
            cy.intercept("POST", `**/workouts/drafts/${discarded.id}/discard`).as("discarded")
            cy.findByRole("button", { name: "Descartar rascunho" }).click()
            cy.findByRole("alertdialog").findByRole("button", { name: "Confirmar descarte" }).click()
            cy.wait("@discarded").its("response.statusCode").should("eq", 201)
            cy.location("pathname").should("eq", `/clientes/${clientId}`)
            cy.visit(editorPath(clientId, discarded.id))
            cy.findByRole("heading", { name: "Rascunho descartado" }).should("be.visible")
            cy.findByLabelText("Título da prescrição").should("not.exist")
          })
        })
      })
    }))
  })

  it("detects an active workout changed by another real tab and rejects a rebase confirmed against an already stale ID", () => {
    newClient("Duas abas").then(clientId => newDraft(clientId, "Task7 Proposta concorrente").then(draft => {
      cy.visit(editorPath(clientId, draft.id))
      cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Proposta concorrente")
      // Electron bloqueia popups. Chrome/CDP abre outra aba real, com a mesma sessão
      // HttpOnly, sem substituir qualquer serviço nem escrever diretamente no banco.
      const changeActiveInOtherTab = (title: string) => cy.getCookies({ log: false }).then(cookies =>
        cy.task<{ id: string; realOtherBrowserTab: boolean }>("drafts:change-active-in-other-tab", { cookies, workout: {
          clientId, title, splits: [{ name: "Treino concorrente", exercises: [{ name: "Remada", sets: "3", reps: "10" }] }],
        } }, { log: false }).then(result => {
          expect(result.realOtherBrowserTab).eq(true)
          return result
        }))
      changeActiveInOtherTab("Task7 Ativo em outra aba").then(firstActive => {
        cy.intercept("POST", `**/workouts/drafts/${draft.id}/finalize`).as("baseConflict")
        confirmFinalize()
        cy.wait("@baseConflict").its("response.body.code").should("eq", "ACTIVE_WORKOUT_CHANGED")
        cy.findByRole("button", { name: "Revisar treino ativo" }).click()
        cy.findByRole("alertdialog").should("contain.text", "Task7 Ativo em outra aba")
        cy.findByRole("link", { name: "Consultar ficha ativa em outra aba" }).should("have.attr", "href", workoutPath(clientId, firstActive.id))
        changeActiveInOtherTab("Task7 Ativo mudou novamente").then(latestActive => {
          cy.intercept("POST", `**/workouts/drafts/${draft.id}/rebase`).as("rebase")
          cy.findByRole("alertdialog").within(() => cy.findByRole("button", { name: "Confirmar nova base" }).click())
          cy.wait("@rebase").then(({ request: sent, response }) => {
            expect(sent.body.expectedActiveWorkoutId).eq(firstActive.id)
            expect(response?.statusCode).eq(409)
          })
          cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Proposta concorrente")
          cy.findByRole("button", { name: "Revisar treino ativo" }).click()
          cy.findByRole("alertdialog").should("contain.text", "Task7 Ativo mudou novamente")
          cy.findByRole("alertdialog").within(() => cy.findByRole("button", { name: "Confirmar nova base" }).click())
          cy.wait("@rebase").then(({ request: sent, response }) => {
            expect(sent.body.expectedActiveWorkoutId).eq(latestActive.id)
            expect(response?.statusCode).eq(201)
            expect(response?.body.baseActiveWorkoutId).eq(latestActive.id)
          })
          cy.findByText("Nova base confirmada. Finalize a prescrição quando estiver pronta.").should("be.visible")
          confirmFinalize()
          cy.findByRole("heading", { name: "Task7 Proposta concorrente" }).should("be.visible")
          cy.location("pathname").should("include", `/clientes/${clientId}/treinos/`)
        })
      })
    }))
  })

  it("preserves edits made during a real save when the subsequent detail read returns 503, then retries without changing the saved baseline", () => {
    newClient("Leitura transitória").then(clientId => newDraft(clientId, "Task7 Baseline inicial").then(draft => {
      cy.visit(editorPath(clientId, draft.id))
      cy.findByLabelText("Título da prescrição").clear().type("Task7 Snapshot enviado")
      let committed = false
      let release!: () => void
      const responseBarrier = new Promise<void>(resolve => { release = resolve })
      cy.intercept({ method: "PUT", url: `**/workouts/drafts/${draft.id}`, times: 1 }, sent => sent.continue(async response => {
        expect(response.statusCode).eq(200)
        committed = true
        await responseBarrier
      })).as("snapshot")
      cy.intercept({ method: "GET", url: `**/workouts/drafts/${draft.id}`, times: 1 }, sent => sent.continue(response => {
        expect(response.statusCode).eq(200)
        response.send({ statusCode: 503, body: { message: "Synthetic unavailable detail after real read" } })
      })).as("failedDetail")
      cy.findByRole("button", { name: "Salvar rascunho" }).click()
      cy.wrap(null).should(() => expect(committed).eq(true))
      cy.findByLabelText("Título da prescrição").type(" com alteração local")
      cy.then(() => release())
      cy.wait(["@snapshot", "@failedDetail"])
      cy.findByRole("heading", { name: "Rascunho indisponível" }).should("be.visible")
      cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Snapshot enviado com alteração local")
      cy.findByText("Alterações não salvas").should("be.visible")
      cy.findByRole("button", { name: "Tentar novamente" }).click()
      cy.findByRole("heading", { name: "Rascunho indisponível" }).should("not.exist")
      cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Snapshot enviado com alteração local")
      cy.findByRole("button", { name: "Voltar para aluno" }).click()
      cy.findByRole("alertdialog").findByRole("button", { name: "Cancelar" }).click()
      cy.findByLabelText("Título da prescrição").clear().type("Task7 Snapshot enviado")
      cy.contains("Rascunho salvo às").should("be.visible")
      cy.findByRole("button", { name: "Voltar para aluno" }).click()
      cy.location("pathname").should("eq", `/clientes/${clientId}`)
      cy.findByRole("alertdialog").should("not.exist")
    }))
  })

  it("proves top-level SPA Back, Forward and traversal; desktop/mobile links and dialog support keyboard and focus", () => {
    cy.getCookies({ log: false }).then(cookies => cy.task<Record<string, unknown>>("drafts:spa-navigation", cookies, { log: false }).then(result => {
      expect(result.mode).eq("spa-top-level")
      expect(result.backCancellations).eq(2)
      expect(result.forwardCancellations).eq(1)
      expect(result.jumpCancellations).eq(1)
      expect(result.keyboardAndFocus).eq(true)
    }))
    newClient("Navegação SPA").then(clientId => newDraft(clientId, "Task7 Navegação salva").then(draft => {
      const path = editorPath(clientId, draft.id)
      cy.visit(`/clientes/${clientId}`)
      let document: Document
      cy.document().then(value => { document = value })
      cy.findByRole("button", { name: "Continuar rascunho" }).click()
      cy.location("pathname").should("eq", path)
      cy.document().should(value => expect(value).eq(document))
      cy.findByLabelText("Título da prescrição").realClick().clear().type("Task7 Texto dirty SPA")
      cy.window().then(window => expect(window.navigator.userActivation.hasBeenActive, "real click activates native traversal cancellation").eq(true))
      cy.findByRole("navigation", { name: "Navegação principal" }).findByRole("link", { name: "Treinos" }).click()
      cy.findByRole("alertdialog").should("contain.text", "Sair com alterações não salvas?")
      cy.focused().should("have.text", "Cancelar")
      cy.realPress("Enter")
      cy.findByRole("alertdialog").should("not.exist")
      cy.location("pathname").should("eq", path)
      cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Texto dirty SPA")
      cy.viewport(390, 844)
      cy.findByRole("button", { name: "Abrir menu" }).click()
      cy.findByRole("dialog").findByRole("link", { name: "Treinos" }).click()
      cy.findByRole("alertdialog").should("be.visible")
      cy.findByRole("dialog").should("not.exist")
      cy.findByRole("alertdialog").within(() => cy.findByRole("button", { name: "Cancelar" }).click())
      cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Texto dirty SPA")
      cy.findByRole("button", { name: "Salvar rascunho" }).click()
      cy.contains("Rascunho salvo às").should("be.visible")
      cy.findByRole("button", { name: "Voltar para aluno" }).click()
      cy.location("pathname").should("eq", `/clientes/${clientId}`)
      cy.findByRole("alertdialog").should("not.exist")
      assertNoStorage()
    }))
  })

  it("uses a new document without Navigation API from first load, replaces the initial save and enters safely from dashboard, record, hub and revision", () => {
    const documents: Document[] = []
    cy.on("window:before:load", window => {
      Object.defineProperty(window, "navigation", { configurable: true, value: undefined })
      documents.push(window.document)
    })
    newClient("Documento").then(clientId => {
      cy.visit("/home")
      cy.findByRole("link", { name: "Criar prescrição para Task7 Documento" }).click()
      cy.findByRole("heading", { name: "Nova elaboração de treino" }).should("be.visible")
      cy.then(() => expect(documents.length, "dashboard entry loads a document").eq(2))
      cy.findByRole("button", { name: "Começar do zero" }).click()
      cy.findByRole("button", { name: "Salvar rascunho" }).click()
      cy.location("pathname").should("include", "/rascunhos/")
      cy.location("pathname").then(path => {
        const assertDocument = () => cy.window().then(window => {
          expect((window as unknown as { navigation?: unknown }).navigation).eq(undefined)
          const initial = window.performance.getEntriesByType("navigation")[0]?.name
          expect(new URL(initial).pathname, "public document timing describes editor route").eq(path)
        })
        cy.findByLabelText("Título da prescrição").should("have.value", "")
        assertDocument()
        cy.window().then(window => { window.history.back() })
        cy.location("pathname").should("eq", "/home")
        cy.window().then(window => { window.history.forward() })
        cy.location("pathname").should("eq", path)
        cy.findByLabelText("Título da prescrição").should("have.value", "")
        assertDocument()
        cy.findByRole("button", { name: "Voltar para aluno" }).click()
        cy.location("pathname").should("eq", `/clientes/${clientId}`)
        cy.findByRole("button", { name: "Continuar rascunho" }).click()
        cy.location("pathname").should("eq", path)
        cy.findByLabelText("Título da prescrição").should("have.value", "")
        assertDocument()
        cy.findByRole("navigation", { name: "Navegação principal" }).findByRole("link", { name: "Treinos" }).click()
        cy.location("pathname").should("eq", "/treinos")
        cy.contains("li", "Task7 Documento").findByRole("button", { name: "Continuar rascunho" }).click()
        cy.location("pathname").should("eq", path)
        cy.findByLabelText("Título da prescrição").should("have.value", "")
        assertDocument()
        cy.findByLabelText("Título da prescrição").type("Task7 Documento finalizado")
        cy.findByRole("button", { name: "Adicionar exercício" }).click()
        cy.findByLabelText("Nome do exercício").type("Remada")
        cy.findByLabelText("Séries").type("3")
        cy.findByLabelText("Repetições").type("10")
        confirmFinalize()
        cy.location("pathname").should("include", "/treinos/")
        cy.findByRole("heading", { name: "Task7 Documento finalizado" }).should("be.visible")
        const beforeRevision = documents.length
        cy.findByRole("button", { name: "Revisar esta ficha" }).click()
        cy.findByLabelText("Título da prescrição").should("have.value", "Task7 Documento finalizado")
        cy.then(() => expect(documents.length).greaterThan(beforeRevision))
        cy.window().then(window => expect(new URL(window.performance.getEntriesByType("navigation")[0].name).pathname).eq(window.location.pathname))
        assertNoStorage()
      })
    })
  })

  it("cancels real native Back twice, Forward and a multi-entry history jump in an independent Chrome document", () => {
    cy.getCookies({ log: false }).then(cookies => cy.task<Record<string, unknown>>("drafts:native-navigation", cookies, { log: false }).then(result => {
      expect(result.backCancellations).eq(2)
      expect(result.forwardCancellations).eq(1)
      expect(result.jumpCancellations).eq(1)
      expect(result.acceptedDestinations).eq(3)
      expect(result.navigationApiAbsentFromDocumentStart).eq(true)
      cy.log(`Native browser proof: ${JSON.stringify(result)}`)
    }))
  })

  for (const mode of ["Navigation API", "document fallback"] as const) {
    it(`purges dirty clinical state on real 403, switches to isolated B and does not restore A with Back (${mode})`, () => {
      let accountACookies: Cypress.Cookie[]
      let nutritionCookies: Cypress.Cookie[]
      let personalBCookies: Cypress.Cookie[]
      cy.getCookies({ log: false }).then(cookies => { accountACookies = cookies })
      if (mode === "document fallback") cy.on("window:before:load", window => Object.defineProperty(window, "navigation", { configurable: true, value: undefined }))
      newClient(`Negação ${mode}`).then(clientId => newDraft(clientId, `Task7 Segredo da conta A ${mode}`).then(draft => {
        const path = editorPath(clientId, draft.id)
        cy.visit(`/clientes/${clientId}`)
        cy.findByRole("button", { name: "Continuar rascunho" }).click()
        cy.findByLabelText("Título da prescrição").type(" texto privado não salvo")
        // Outra sessão real altera os cookies; o papel NUTRITIONIST recebe 403 do guard real.
        request("POST", "/auth/login", { email: "nutri.phase1@e2e.test", password })
        cy.getCookies({ log: false }).then(cookies => { nutritionCookies = cookies })
        cy.intercept("PUT", `**/workouts/drafts/${draft.id}`).as("deniedSave")
        cy.findByRole("button", { name: "Salvar rascunho" }).click()
        cy.wait("@deniedSave").its("response.statusCode").should("eq", 403)
        cy.findByRole("heading", { name: "Restabeleça seu acesso" }).should("be.visible")
        cy.findByLabelText("Título da prescrição").should("not.exist")
        cy.contains("texto privado não salvo").should("not.exist")
        request("POST", "/auth/login", { email: "personal-b.phase1@e2e.test", password })
        cy.getCookies({ log: false }).then(cookies => { personalBCookies = cookies })
        cy.visit("/home")
        cy.findByRole("link", { name: "Abrir prontuário de Aluno Exclusivo Personal B" }).should("be.visible")
        cy.contains("Task7 Segredo da conta A").should("not.exist")
        cy.window().then(window => { window.history.back() })
        cy.location("pathname").should("eq", path)
        cy.findByLabelText("Título da prescrição").should("not.exist")
        cy.contains("Task7 Segredo da conta A").should("not.exist")
        cy.contains("texto privado não salvo").should("not.exist")
        request("GET", `/workouts/drafts/${draft.id}`, undefined, false).its("status").should("eq", 404)
        request<{ items: { title: string }[] }>("GET", "/workouts/drafts").then(({ body }) => expect(body.items.some(item => item.title.includes("Task7"))).eq(false))
        cy.visit("/treinos")
        cy.findByText("Ficha Exclusiva Personal B").should("be.visible")
        cy.contains("Task7 Segredo da conta A").should("not.exist")
        assertNoStorage()
        if (mode === "document fallback") {
          // Cada documento resolve /auth/me. Respeita a janela real60/min/IP
          // antes da prova top-level extra, sem ampliar timeouts das asserções.
          cy.wait(61_000)
          cy.then(() => cy.task<Record<string, unknown>>("drafts:session-back", { cookies: accountACookies, nutritionCookies, personalBCookies }, { log: false }).then(result => {
            expect(result.realRole403).eq(true)
            expect(result.oldClinicalStateAbsentAfterBack).eq(true)
            expect(result.sessionSwitchWithoutPrior403).eq(true)
          }))
        }
      }))
    })
  }
})
