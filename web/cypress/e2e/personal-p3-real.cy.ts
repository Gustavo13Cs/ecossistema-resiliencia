import { suggestPeriodization } from "../../lib/workout-periodization"

const apiUrl = "http://localhost:3000"
function request<T = Record<string, unknown>>(method: string, path: string, body?: Cypress.RequestBody, failOnStatusCode = true) {
  return cy.getCookie("csrf_token").then(cookie => cy.request<T>({ method, url: `${apiUrl}${path}`, body, failOnStatusCode, headers: { Origin: "http://localhost:3001", "X-CSRF-Token": cookie?.value ?? "" } }))
}
function createClient(name: string) {
  return request<{id:string}>("POST","/clients",{name:`Task7 P3 ${name}`}).then(response => response.body.id)
}
function content(title: string) {
  return { title, durationWeeks:8, periodization:{...suggestPeriodization(8),startsOn:"2026-10-23",progression:{intervalWeeks:2,repsDelta:1,effortDelta:1}}, splits:[{name:"Treino A",weeklyFrequency:1,exercises:[{name:"Supino",sets:"4",reps:"6-8",muscleGroup:"CHEST",secondaryMuscles:[{muscleGroup:"TRICEPS",weight:0.5}],load:"42 kg",notes:"Orientação individual Task7 P3"}]}] }
}
function finalize() {
  cy.findByRole("button",{name:"Finalizar prescrição"}).click()
  cy.findByRole("alertdialog").within(() => cy.findByRole("button",{name:"Confirmar finalização"}).click())
}

describe("Personal P3 with real API, PostgreSQL and browser", () => {
  before(() => cy.task("drafts:cleanup"))
  after(() => cy.task("drafts:cleanup"))
  beforeEach(() => cy.loginAs("PERSONAL"))

  it("persists volume and periodization, deep-copies a private model and isolates a second account", () => {
    createClient("Origem").then(clientId => {
      request<{id:string}>("POST","/workouts/drafts",{clientId,content:content("Task7 P3 Ficha origem")}).then(({body:draft}) => {
        cy.visit(`/clientes/${clientId}/rascunhos/${draft.id}`)
        cy.findByLabelText("Frequência semanal").select("2")
        cy.findByRole("region",{name:"Volume semanal estimado"}).within(() => cy.findByRole("row",{name:/Peitoral/}).should("contain.text","8"))
        cy.intercept("PUT",`**/workouts/drafts/${draft.id}`).as("savedP3")
        cy.findByRole("button",{name:"Salvar rascunho"}).click()
        cy.wait("@savedP3").its("response.statusCode").should("eq",200)
        cy.reload()
        cy.findByLabelText("Frequência semanal").should("have.value","2")
        cy.findByLabelText("Data de início").should("have.value","2026-10-23")
        cy.intercept("POST",`**/workouts/drafts/${draft.id}/finalize`).as("finalP3")
        finalize()
        cy.wait("@finalP3").then(({response}) => {
          const originalId = String(response?.body.finalizedWorkoutId)
          cy.findByRole("heading",{name:"Task7 P3 Ficha origem"}).should("be.visible")
          cy.findByRole("link",{name:"Semana 8 · Deload"}).click()
          cy.findByRole("heading",{name:"Semana 8 de 8 · Deload"}).should("be.visible")
          cy.findByText(/Semana de recuperação/).should("be.visible")
          cy.findByRole("region",{name:"Treino A"}).should("contain.text","2 séries × 6-8 repetições")
          cy.window().then(window => cy.stub(window,"print").as("printP3"))
          cy.findByRole("button",{name:"Imprimir ficha salva"}).click()
          cy.get("@printP3").should("have.been.calledOnce")
          cy.intercept("POST","**/workouts/templates/from-workout/*").as("modelP3")
          cy.findByRole("button",{name:"Salvar como modelo"}).click()
          cy.findByRole("dialog").within(() => {
            cy.findByLabelText("Nome do modelo").clear().type("Task7 P3 Modelo privado")
            cy.findByLabelText("Objetivo do modelo").select("MUSCLE_GAIN")
            cy.findByLabelText("Nível do modelo").select("INTERMEDIATE")
            cy.findByRole("button",{name:"Salvar modelo"}).click()
          })
          cy.wait("@modelP3").then(({response:modelResponse}) => {
            expect(modelResponse?.statusCode).eq(201)
            const model = modelResponse?.body.template
            expect(model.content.splits[0].exercises[0].load).eq("")
            expect(model.content.splits[0].exercises[0].notes).eq("")
            expect(model.content.periodization.startsOn).eq("")
            expect(JSON.stringify(model.content)).not.contain(clientId)
            createClient("Destino").then(destinationId => {
              cy.visit(`/clientes/${destinationId}/novo-treino`)
              cy.findByRole("button",{name:"Começar a partir de modelo"}).click()
              cy.findByRole("dialog").within(() => {
                cy.findByLabelText("Origem dos modelos").select("private")
                cy.findByRole("button",{name:"Pré-visualizar Task7 P3 Modelo privado"}).click()
                cy.findByRole("button",{name:"Usar este modelo"}).click()
              })
              cy.location("pathname").should("match",new RegExp(`/clientes/${destinationId}/rascunhos/`))
              cy.findByLabelText("Objetivo").should("have.value","Hipertrofia")
              cy.findByLabelText("Repetições").clear().type("12")
              cy.findByLabelText("Data de início").type("2026-10-23")
              cy.intercept("POST","**/workouts/drafts/*/finalize").as("copyFinalP3")
              finalize()
              cy.wait("@copyFinalP3").then(({response:copyResponse}) => {
                const copyId = String(copyResponse?.body.finalizedWorkoutId)
                expect(copyId).not.eq(originalId)
                request<{splits:{exercises:{id:string;reps:string}[]}[]}>("GET",`/workouts/${originalId}`).then(({body:original}) => {
                  expect(original.splits[0].exercises[0].reps).eq("6-8")
                  expect(copyResponse?.body.workout.splits[0].exercises[0].id).not.eq(original.splits[0].exercises[0].id)
                })
                request("POST","/auth/logout")
                request("POST","/auth/login",{email:"personal-b.phase1@e2e.test",password:"SafeMove-E2E-2026!"})
                request("GET",`/workouts/templates/${model.id}`,undefined,false).its("status").should("eq",404)
                request("POST",`/workouts/templates/${model.id}/create-draft`,{clientId:destinationId},false).its("status").should("eq",404)
                request("GET",`/workouts/${originalId}`,undefined,false).its("status").should("eq",404)
              })
            })
          })
        })
      })
    })
  })

  it("preserves edits after a transient draft save failure", () => {
    createClient("Recuperação").then(clientId => request<{id:string}>("POST","/workouts/drafts",{clientId,content:content("Task7 P3 Recuperação")}).then(({body:draft}) => {
      cy.visit(`/clientes/${clientId}/rascunhos/${draft.id}`)
      cy.findByLabelText("Título da prescrição").clear().type("Task7 P3 Alteração preservada")
      cy.intercept({method:"PUT",url:`**/workouts/drafts/${draft.id}`,times:1},{statusCode:503,body:{message:"Synthetic transient failure"}}).as("transientP3")
      cy.findByRole("button",{name:"Salvar rascunho"}).click()
      cy.wait("@transientP3")
      cy.findByLabelText("Título da prescrição").should("have.value","Task7 P3 Alteração preservada")
      cy.intercept("PUT",`**/workouts/drafts/${draft.id}`).as("recoveredP3")
      cy.findByRole("button",{name:"Salvar rascunho"}).click()
      cy.wait("@recoveredP3").its("response.statusCode").should("eq",200)
      request<{content:{title:string}}>("GET",`/workouts/drafts/${draft.id}`).its("body.content.title").should("eq","Task7 P3 Alteração preservada")
    }))
  })
})
