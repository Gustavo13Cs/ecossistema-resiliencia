import type { WorkoutDraftResource } from "../../types/workout-draft"
import type { ExerciseLibraryDetail, WorkoutDetail } from "../../types/workout"

const api = "http://localhost:3000"
const origin = "http://localhost:3001"
const mediaUrl = "https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/bench-press/frame-1.svg"
const ownName = `Task6 próprio ${Date.now()}`
const manualName = `Task6 sem vídeo ${Date.now()}`
let ownId: string
let clientId: string
let workoutId: string
let svg: string
let failMedia = false
let mediaRequests = 0
let printing = false

function request<T>(method: string, path: string, body?: Cypress.RequestBody, failOnStatusCode = true) {
  return cy.getCookie("csrf_token").then(cookie => cy.request<T>({ method, url: `${api}${path}`, body, failOnStatusCode,
    headers: { Origin: origin, "X-CSRF-Token": cookie?.value ?? "" } }))
}
const detail = () => cy.findByRole("dialog", { name: "Execução do exercício" })
function closeDetail() {
  detail().findByRole("button", { name: "Fechar" }).click()
  detail().should("not.exist")
  cy.get("body").should("not.have.css", "pointer-events", "none")
}
function openLibrary(name: string, card = 0) {
  cy.task("visual:checkpoint", `open library ${card}: ${name}`)
  cy.findByTestId(`workout-exercise-card-${card}`).findByRole("button", { name: "Biblioteca de exercícios" }).click()
  cy.findByPlaceholderText("Buscar exercício (ex.: supino, agachamento)...").clear().should("have.value", "").type(name)
}
function select(name: string, card = 0) {
  openLibrary(name, card)
  cy.findByRole("button", { name: `Ver execução de ${name}` }).click()
  detail().findByRole("button", { name: "Adicionar ao treino" }).click()
  cy.findByTestId(`workout-exercise-card-${card}`).findByLabelText("Nome do exercício").should("have.value", name)
  detail().should("not.exist")
  cy.get('[data-slot="popover-content"]').should("not.exist")
  cy.get("body").should("not.have.css", "pointer-events", "none")
}
function noOverflow() {
  cy.document().should(doc => expect(doc.documentElement.scrollWidth).lte(doc.documentElement.clientWidth))
}
function printMedia(value: "print" | "screen") {
  return cy.then(() => {
    printing = value === "print"
    return Cypress.automation("remote:debugger:protocol", { command: "Emulation.setEmulatedMedia", params: { media: value } })
  })
}

// Somente bytes do asset aprovado são substituídos. Todas as rotas de domínio,
// sessões, guards, leituras e gravações continuam no servidor e PostgreSQL reais.
describe("Biblioteca visual real: seleção explícita, snapshots e privacidade", () => {
  before(() => cy.task<string>("visual:licensed-fixture").then(bytes => { svg = bytes }))
  after(() => cy.task("visual:cleanup"))
  beforeEach(() => {
    cy.loginAs("PERSONAL")
    cy.intercept("GET", mediaUrl, req => {
      expect(req.headers.referer, "no clinical page referrer on real image request").eq(undefined)
      expect(req.url).eq(mediaUrl)
      mediaRequests++
      req.reply({ statusCode: failMedia ? 404 : 200, headers: { "content-type": "image/svg+xml", "cache-control": "no-store" }, body: failMedia ? "" : svg })
    }).as("licensedMedia")
  })
  afterEach(function () {
    failMedia = false
    if (this.currentTest?.state === "failed") {
      cy.task("visual:failure", this.currentTest.err?.stack ?? this.currentTest.err?.message ?? "Unknown failure")
      cy.document().then(doc => cy.task("visual:checkpoint", JSON.stringify({ stage: "failure layers", bodyPointer: doc.body.style.pointerEvents, scrollLock: doc.body.getAttribute("data-scroll-locked"), layers: Array.from(doc.querySelectorAll('[role="dialog"], [role="alertdialog"], [data-slot="dialog-overlay"], [data-slot="popover-content"]')).map(el => ({ slot: el.getAttribute("data-slot"), state: el.getAttribute("data-state"), text: el.textContent?.slice(0, 300) })) })))
    }
    if (printing) printMedia("screen")
  })

  it("filters the real catalog and creates own exercises with normalized and absent links", () => {
    cy.visit("/exercicios")
    cy.findByRole("heading", { name: "Exercícios" }).should("be.visible")
    request<ExerciseLibraryDetail[]>("GET", "/workouts/exercise-library").then(({ body }) => expect(body.filter(item => item.source === "CATALOG")).to.have.length(148))
    cy.findByLabelText("Buscar exercício").type("Supino")
    cy.findByLabelText("Grupo muscular", { exact: true }).select("CHEST")
    cy.findByLabelText("Equipamento", { exact: true }).select("BARBELL")
    cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).focus().realPress("Enter")
    detail().should("be.visible")
    cy.wait("@licensedMedia")
    detail().findByRole("img").should(img => expect((img[0] as HTMLImageElement).naturalWidth).greaterThan(0))
    detail().should("contain.text", "CC BY-SA 4.0").and("contain.text", "Bryl Lim").and("contain.text", "Ilustração")
    detail().findByRole("button", { name: "Fechar" }).should("be.focused")
    cy.realPress(["Shift", "Tab"])
    cy.focused().should(element => expect(element.closest('[role="dialog"]').length).eq(1))
    cy.realPress("Escape")
    detail().should("not.exist")
    cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).should("be.focused")
    cy.viewport(1440, 900)
    noOverflow()
    cy.screenshot("task6-library-desktop-final", { capture: "viewport", overwrite: true })
    for (const [name, link] of [[ownName, "https://youtu.be/dQw4w9WgXcQ"], [manualName, ""]]) {
      cy.findByRole("button", { name: "Novo exercício" }).click()
      cy.findByLabelText("Nome do exercício").type(name)
      if (link) cy.findByLabelText("Link do vídeo (opcional)").type(link)
      cy.intercept("POST", "**/workouts/exercise-library").as("created")
      cy.findByRole("button", { name: "Salvar exercício" }).click()
      cy.wait("@created").then(({ response }) => {
        expect(response?.statusCode).eq(201)
        if (link) ownId = response?.body.id
      })
      cy.findByText("Exercício salvo na sua biblioteca.").should("be.visible")
    }
    cy.findByLabelText("Buscar exercício").clear().should("have.value", "").type(ownName)
    cy.findByLabelText("Equipamento", { exact: true }).select("")
    cy.findByLabelText("Fonte").select("CUSTOM")
    cy.findByRole("button", { name: `Ver execução de ${ownName}` }).click()
    detail().findByRole("link", { name: "Abrir vídeo" }).should("have.attr", "href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ").and("have.attr", "rel", "noopener noreferrer")
    cy.get("iframe, video").should("not.exist")
    closeDetail()
    cy.findByLabelText("Buscar exercício").clear().should("have.value", "").type(manualName)
    cy.findByRole("button", { name: `Ver execução de ${manualName}` }).click()
    detail().should("contain.text", "Demonstração indisponível")
  })

  it("previews without selecting or losing text, explicitly selects, saves/finalizes and reads the immutable snapshot with real print CSS", () => {
    request<{ id: string }>("POST", "/clients", { name: `Task6 Biblioteca ${Date.now()}` }).then(({ body }) => {
      clientId = body.id
      cy.visit(`/clientes/${clientId}/novo-treino`)
      cy.findByRole("button", { name: "Começar do zero" }).click()
      cy.findByLabelText("Título da prescrição").type("Task6 Ficha visual")
      cy.findByLabelText("Orientações gerais").type("Texto clínico sintético permanece na impressão")
      cy.findByRole("button", { name: "Adicionar exercício" }).click()
      cy.findByLabelText("Nome do exercício").type("Texto manual preservado")
      cy.findByLabelText("Séries").type("3")
      cy.findByLabelText("Repetições").type("8")
      cy.task("visual:checkpoint", "initial preview")
      openLibrary("Supino reto com barra")
      let pointerFocus: HTMLElement
      let stopFocusCapture: () => void
      cy.document().then(doc => {
        pointerFocus = doc.activeElement as HTMLElement
        const track = (event: FocusEvent) => {
          if (!doc.querySelector('[data-slot="dialog-content"]')) pointerFocus = event.target as HTMLElement
        }
        doc.addEventListener("focusin", track)
        stopFocusCapture = () => doc.removeEventListener("focusin", track)
      })
      cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).click()
      detail().should("be.visible")
      cy.then(() => stopFocusCapture())
      cy.wait("@licensedMedia")
      cy.realPress("Escape")
      detail().should("not.exist")
      cy.document().should(doc => {
        const expected = pointerFocus.isConnected ? pointerFocus : doc.getElementById(pointerFocus.id)
        expect(expected, "actual previous pointer focus or its exact replacement").not.eq(null)
        expect(expected?.isConnected).eq(true)
        expect(expected?.matches(":disabled, body, html")).eq(false)
        expect(doc.activeElement).eq(expected)
      })
      cy.findByLabelText("Nome do exercício").should("have.value", "Texto manual preservado")
      cy.findByRole("button", { name: "Retirar vínculo" }).should("not.exist")
      cy.findByLabelText("Séries").should("have.value", "3")
      cy.task("visual:checkpoint", "pointer focus restored; keyboard preview")
      cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).focus().should("be.focused").realPress("Enter")
      detail().should("be.visible")
      cy.realPress("Escape")
      detail().should("not.exist")
      cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).should("be.focused")
      cy.task("visual:checkpoint", "explicit add after preview without toggling existing popover")
      cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).click()
      detail().findByRole("button", { name: "Adicionar ao treino" }).click()
      cy.findByTestId("workout-exercise-card-0").findByLabelText("Nome do exercício").should("have.value", "Supino reto com barra")
      detail().should("not.exist")
      cy.get('[data-slot="popover-content"]').should("not.exist")
      cy.findByRole("button", { name: "Adicionar exercício" }).click()
      select(ownName, 1)
      cy.findByTestId("workout-exercise-card-1").within(() => {
        cy.findByLabelText("Séries").type("2")
        cy.findByLabelText("Repetições").type("12")
      })
      cy.intercept("POST", "**/workouts/drafts").as("draftSaved")
      cy.findByRole("button", { name: "Salvar rascunho" }).click()
      cy.wait("@draftSaved").then(({ request: sent, response }) => {
        expect(JSON.stringify(sent.body)).not.to.include("demonstrationSnapshot")
        const draft = response?.body as WorkoutDraftResource
        expect(draft.schemaVersion).eq(2)
        const rows = draft.content!.splits[0].exercises
        expect(rows[0].libraryReference?.exerciseId).eq("cat-chest-01")
        expect(rows[0].demonstrationSnapshot?.assets?.[0].url).eq(mediaUrl)
        expect(rows[1].demonstrationSnapshot?.personalVideoUrl).eq("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        cy.location("pathname").should("eq", `/clientes/${clientId}/rascunhos/${draft.id}`)
        cy.findByRole("button", { name: "Salvar rascunho" }).should("be.enabled")
        cy.task("visual:checkpoint", "draft snapshot saved and editor handoff complete")
        cy.reload()
        cy.findByLabelText("Título da prescrição").should("have.value", "Task6 Ficha visual")
        cy.intercept("POST", `**/workouts/drafts/${draft.id}/finalize`).as("finalized")
        cy.findByRole("button", { name: "Finalizar prescrição" }).click()
        cy.findByRole("alertdialog").findByRole("button", { name: "Confirmar finalização" }).click()
        cy.wait("@finalized").then(({ response: finalized }) => {
          expect(finalized?.statusCode).eq(201)
          workoutId = finalized?.body.finalizedWorkoutId
          cy.location("pathname").should("eq", `/clientes/${clientId}/treinos/${workoutId}`)
          cy.reload()
          cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).click()
          detail().findByRole("img").should("have.attr", "src", mediaUrl)
          detail().should("be.visible")
          cy.get('[data-slot="dialog-overlay"]').should(nodes => {
            const overlay = nodes[0]
            const style = overlay.ownerDocument.defaultView!.getComputedStyle(overlay)
            expect(style.display).not.eq("none")
            expect(Number(style.opacity)).eq(1)
            expect(overlay.getBoundingClientRect().width).greaterThan(0)
            expect(overlay.getBoundingClientRect().height).greaterThan(0)
          })
          cy.task("visual:checkpoint", "saved snapshot reopened; print with detail open")
          printMedia("print")
          cy.window().should(win => expect(win.matchMedia("print").matches).eq(true))
          cy.get('[data-slot="dialog-overlay"], [data-slot="dialog-content"]').should(nodes => {
            expect(nodes.length).eq(2)
            nodes.each((_, node) => { expect(node.ownerDocument.defaultView!.getComputedStyle(node).display).eq("none") })
          })
          cy.get("article").should("be.visible").and("contain.text", "Supino reto com barra").and("contain.text", "Texto clínico sintético permanece na impressão")
          cy.task("visual:checkpoint", "actual print hides overlay/content and retains prescription")
          printMedia("screen")
          detail().should("be.visible")
          cy.realPress("Escape")
          cy.viewport(390, 844)
          noOverflow()
          cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).click()
          detail().should("be.visible")
          noOverflow()
          cy.screenshot("task6-saved-detail-mobile-final", { capture: "viewport", overwrite: true })
          cy.realPress("Escape")
          cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).should("be.focused")
        })
      })
    })
  })

  it("detects real link CAS conflicts, keeps historical media after update/delete, detaches on rename and isolates account B", () => {
    cy.visit("/exercicios")
    cy.findByLabelText("Buscar exercício").type(ownName)
    cy.findByRole("button", { name: `Ver execução de ${ownName}` }).click()
    detail().findByLabelText("Link do vídeo (opcional)").should("have.value", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    cy.then(() => request<ExerciseLibraryDetail>("PATCH", `/workouts/exercise-library/${ownId}`, { expectedMediaVersion: 1, videoUrl: "https://vimeo.com/123456789" }))
    detail().findByLabelText("Link do vídeo (opcional)").clear().should("have.value", "").type("https://youtu.be/abcdefghijk")
    cy.intercept("PATCH", "**/workouts/exercise-library/*").as("update")
    detail().findByRole("button", { name: "Salvar link" }).click()
    cy.wait("@update").its("response.statusCode").should("eq", 409)
    detail().should("contain.text", "Este link foi alterado em outra sessão")
    detail().findByRole("button", { name: "Conferir versão atual" }).click()
    detail().should("contain.text", "https://vimeo.com/123456789")
    detail().findByLabelText("Link do vídeo (opcional)").should("have.value", "https://youtu.be/abcdefghijk")
    detail().findByRole("button", { name: "Salvar link" }).click()
    cy.wait("@update").its("response.statusCode").should("eq", 200)
    closeDetail()
    cy.then(() => cy.visit(`/clientes/${clientId}/treinos/${workoutId}`))
    cy.findByRole("button", { name: `Ver execução de ${ownName}` }).click()
    detail().findByRole("link", { name: "Abrir vídeo" }).should("have.attr", "href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    closeDetail()
    cy.findByRole("button", { name: "Revisar esta ficha" }).click()
    cy.findByTestId("workout-exercise-card-0").within(() => {
      cy.findByLabelText("Nome do exercício").clear().should("have.value", "").type("Movimento manual renomeado")
      cy.findByText(/O nome mudou; a demonstração foi desvinculada/).should("be.visible")
      cy.findByRole("button", { name: "Retirar vínculo" }).should("not.exist")
    })
    cy.findByTestId("workout-exercise-card-1").findByRole("button", { name: "Retirar vínculo" }).click()
    openLibrary(ownName, 1)
    cy.intercept("DELETE", "**/workouts/exercise-library/*").as("deleted")
    cy.findByRole("button", { name: `Excluir exercício próprio ${ownName}` }).click()
    cy.wait("@deleted").its("response.statusCode").should("eq", 200)
    cy.realPress("Escape")
    cy.intercept("PUT", "**/workouts/drafts/*").as("savedRevision")
    cy.findByRole("button", { name: "Salvar rascunho" }).click()
    cy.wait("@savedRevision").then(({ response }) => {
      const draft = response?.body as WorkoutDraftResource
      for (const row of draft.content!.splits[0].exercises) {
        expect(row.libraryReference).eq(null)
        expect(row.demonstrationSnapshot).eq(null)
      }
      cy.location("pathname").should("eq", `/clientes/${clientId}/rascunhos/${draft.id}`)
      cy.findByText(/^Rascunho salvo às /).should("be.visible").and("have.attr", "role", "status")
      cy.findByRole("button", { name: "Salvar rascunho" }).should("be.enabled")
    })
    cy.then(() => cy.visit(`/clientes/${clientId}/treinos/${workoutId}`))
    cy.findByRole("button", { name: `Ver execução de ${ownName}` }).click()
    detail().findByRole("link", { name: "Abrir vídeo" }).should("have.attr", "href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    closeDetail()
    cy.then(() => { failMedia = true })
    cy.findByRole("button", { name: "Ver execução de Supino reto com barra" }).click()
    cy.wait("@licensedMedia").its("response.statusCode").should("eq", 404)
    detail().should("contain.text", "Demonstração indisponível").and("contain.text", "Deite-se no banco reto")
    closeDetail()
    cy.findByRole("heading", { name: "Task6 Ficha visual" }).should("be.visible")
    cy.then(() => request<WorkoutDetail>("GET", `/workouts/${workoutId}`)).then(({ body }) => {
      expect(body.splits[0].exercises[0].demonstrationSnapshot?.assets?.[0].url).eq(mediaUrl)
      expect(body.splits[0].exercises[1].demonstrationSnapshot?.personalVideoUrl).eq("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    })
    // B is a real JWT session. Query the remaining private item (not the deleted one).
    request<ExerciseLibraryDetail[]>("GET", `/workouts/exercise-library?q=${encodeURIComponent(manualName)}`).then(({ body }) => {
      const privateId = body[0].id
      request("POST", "/auth/login", { email: "personal-b.phase1@e2e.test", password: "SafeMove-E2E-2026!" })
      request<ExerciseLibraryDetail[]>("GET", `/workouts/exercise-library?q=${encodeURIComponent(manualName)}`).its("body").should("deep.eq", [])
      request("GET", `/workouts/exercise-library/${privateId}`, undefined, false).its("status").should("eq", 404)
      cy.visit("/exercicios")
      cy.findByLabelText("Buscar exercício").type(manualName)
      cy.findByText("Nenhum exercício encontrado. Ajuste os filtros ou cadastre um exercício próprio.").should("be.visible")
      cy.then(() => request("GET", `/workouts/${workoutId}`, undefined, false)).its("status").should("eq", 404)
    })
    cy.then(() => expect(mediaRequests, "real browser media requests were exercised").greaterThan(2))
  })

  it("serves exact production CSP and no-referrer with nonce, and contains no private persistent browser data", () => {
    cy.request("/exercicios").then(response => {
      expect(response.headers["referrer-policy"]).eq("no-referrer")
      const csp = String(response.headers["content-security-policy"])
      const nonce = csp.match(/'nonce-([^']+)'/)?.[1]
      expect(nonce).to.be.a("string").and.not.empty
      const expected = ["default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/", "media-src 'self' https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/", "font-src 'self' data:", "connect-src 'self'", "worker-src 'self' blob:", "manifest-src 'self'"].join("; ")
      expect(csp).eq(expected)
      expect(response.body).to.include(`nonce="${nonce}"`)
      cy.writeFile("cypress/results/task6-headers.json", { referrerPolicy: response.headers["referrer-policy"], csp: csp.replace(nonce!, "<per-request nonce>"), mediaRequests })
    })
    cy.window().then(win => {
      const stored = [win.localStorage, win.sessionStorage].flatMap(storage => Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index)!))).join(" ")
      expect(stored).not.to.match(/Task6|clínico|dQw4w9WgXcQ|access_token|refresh_token/i)
    })
  })
})
