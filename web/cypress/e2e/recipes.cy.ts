function assertPageFitsViewport() {
  cy.document().should((document) => {
    const scrollingElement = document.scrollingElement
    expect(scrollingElement, "elemento rolável da página").not.to.equal(null)
    if (scrollingElement) expect(scrollingElement.scrollWidth, "largura da página").to.be.at.most(scrollingElement.clientWidth)
    const main = document.querySelector("main")
    expect(main, "conteúdo principal").not.to.equal(null)
    if (main) expect(main.scrollWidth, "largura do conteúdo principal").to.be.at.most(main.clientWidth)
  })
}

function assertPickerLayoutAndTouchTargets() {
  cy.get('[role="dialog"]').should(($dialogs) => {
    const dialog = $dialogs[0]
    const viewport = dialog.ownerDocument.defaultView
    const bounds = dialog.getBoundingClientRect()
    expect(bounds.left, "borda esquerda do seletor").to.be.at.least(0)
    expect(bounds.right, "borda direita do seletor").to.be.at.most(viewport?.innerWidth ?? 0)
    expect(bounds.top, "borda superior do seletor").to.be.at.least(0)
    expect(bounds.bottom, "borda inferior do seletor").to.be.at.most(viewport?.innerHeight ?? 0)
    for (const container of [dialog, ...Array.from(dialog.querySelectorAll("div"))]) {
      if (container.clientWidth > 0) {
        expect(container.scrollWidth, `conteúdo horizontal em ${container.getAttribute("class")}`).to.be.at.most(container.clientWidth)
      }
    }
    for (const control of Array.from(dialog.querySelectorAll("button, input, select"))) {
      const target = control.matches('input[type="checkbox"]') ? control.closest("label") : control
      expect(target, "alvo do controle").not.to.equal(null)
      if (!target) continue
      const name = control.getAttribute("aria-label") || control.textContent || control.tagName
      const targetBounds = target.getBoundingClientRect()
      expect(targetBounds.height, `altura do alvo ${name}`).to.be.at.least(44)
      expect(targetBounds.width, `largura do alvo ${name}`).to.be.at.least(44)
    }
  })
  assertPageFitsViewport()
}

describe("Banco de receitas na prescrição", () => {
  it("cria e filtra uma receita ativa, adiciona alimento e versão à dieta e salva payload XOR", () => {
    cy.viewport(1280, 900)
    const food = { id: "oat", name: "Aveia", baseUnit: "g", baseAmount: 100, source: "MANUAL", kcal: 400, protein: 10, carbs: 60, fat: 8, fiber: 10, sodium: 20, calcium: 80, iron: 4 }
    const version = { id: "version-1", recipeId: "recipe-1", version: 1, name: "Panqueca de aveia", description: null, category: "BREAKFAST", servings: 2, instructions: null, isGlutenFree: false, isLactoseFree: false, isVegan: false, kcal: 200, protein: 5, carbs: 30, fat: 4, fiber: 5, sodium: 10, calcium: 40, iron: 2, ingredients: [{ id: "ingredient-1", recipeVersionId: "version-1", foodId: "oat", food, quantity: 100, measure: "g" }], createdAt: "2026-09-21T00:00:00Z" }
    const recipe = { id: "recipe-1", status: "ACTIVE", currentVersionId: "version-1", currentVersion: version, createdAt: "2026-09-21T00:00:00Z", updatedAt: "2026-09-21T00:00:00Z" }
    let created = false
    let recipeRequestFails = false

    cy.intercept("GET", "**/auth/me", { body: { user: { sub: "pro-one", role: "NUTRITIONIST", name: "Ana" }, csrfToken: "csrf-e2e" } })
    cy.intercept("GET", "**/foods/search*", { body: [food] })
    cy.intercept("GET", "**/foods?*", { body: [food] })
    cy.intercept("GET", "**/foods/oat/preference*", { body: { measure: "" } })
    cy.intercept("GET", "**/recipes?*", (request) => {
      if (recipeRequestFails) {
        request.reply({ statusCode: 503, body: { message: "Serviço temporariamente indisponível" } })
        return
      }
      const query = String(request.query.q ?? "").toLocaleLowerCase()
      request.reply({ body: created && (!query || recipe.currentVersion.name.toLocaleLowerCase().includes(query)) ? [recipe] : [] })
    }).as("recipes")
    cy.intercept("POST", "**/recipes", (request) => {
      expect(request.body).to.include({ name: "Panqueca de aveia", servings: 2 })
      expect(request.body.ingredients).to.deep.equal([{ foodId: "oat", quantity: 100, measure: "g" }])
      created = true
      request.reply({ statusCode: 201, body: recipe })
    }).as("createRecipe")
    cy.intercept("GET", "**/clients/client-one", { body: { id: "client-one", professionalId: "pro-one", name: "Cliente", birthDate: "1990-01-01", gender: "F", initialWeight: 70 } })
    cy.intercept("GET", "**/diet-plans/client/client-one/active", { body: null })
    cy.intercept("POST", "**/diet-plans", (request) => {
      expect(request.body.clientId).to.equal("client-one")
      expect(request.body.meals[0].items).to.deep.include({ quantity: 1.5, measure: "porções", recipeVersionId: "version-1" })
      expect(request.body.meals[0].items).to.deep.include({ quantity: 100, measure: "", foodId: "oat" })
      request.body.meals[0].items.forEach((item: { foodId?: string; recipeVersionId?: string }) => {
        expect(Boolean(item.foodId) !== Boolean(item.recipeVersionId)).to.equal(true)
      })
      request.reply({ statusCode: 201, body: { id: "plan-1" } })
    }).as("saveDiet")

    cy.visit("/receitas")
    cy.contains("button", "Nova receita").click()
    cy.get("#recipe-name").type("Panqueca de aveia")
    cy.get("#recipe-servings").type("{selectall}2")
    cy.get('input[aria-label="Buscar alimento"]').type("Aveia")
    cy.get('button[aria-label="Adicionar Aveia"]').click()
    cy.get("#ingredient-quantity-oat").type("{selectall}100")
    cy.get("#ingredient-measure-oat").clear().type("g")
    cy.contains("button", "Salvar receita").click()
    cy.wait("@createRecipe")
    cy.get('input[aria-label="Buscar receitas"]').type("Panqueca")
    cy.contains("Panqueca de aveia").should("be.visible")
    assertPageFitsViewport()

    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      cy.viewport(viewport.width, viewport.height)
      cy.then(() => { recipeRequestFails = true })
      cy.visit("/clientes/client-one/nova-dieta")
      cy.contains("button", "Buscar e Adicionar Alimento ou Receita").should("be.visible")
      assertPageFitsViewport()
      cy.contains("button", "Buscar e Adicionar Alimento ou Receita").click()
      cy.contains('[role="dialog"] button', "Add").should("be.visible")
      assertPickerLayoutAndTouchTargets()

      cy.contains("button", "Cadastrar Manualmente").click()
      cy.get('input[placeholder="Ex: Panqueca de Aveia do Nutri"]').should("be.visible")
      assertPickerLayoutAndTouchTargets()
      cy.contains("button", "Voltar para Busca").click()

      cy.contains('[role="tab"]', "Receitas").click()
      cy.contains('[role="alert"]', "Não foi possível carregar receitas.").should("be.visible")
      assertPickerLayoutAndTouchTargets()
      cy.then(() => { recipeRequestFails = false })
      cy.contains("button", "Tentar novamente").click()
      cy.get('input[aria-label="Buscar receitas"]').type("Panqueca")
      cy.get('input[aria-label="Porções de Panqueca de aveia"]').should("be.visible")
      assertPickerLayoutAndTouchTargets()
      cy.get('input[aria-label="Porções de Panqueca de aveia"]').type("{selectall}1.5")
      cy.get('button[aria-label="Adicionar Panqueca de aveia"]').click()
      cy.contains("Versão 1").should("be.visible")
      cy.contains("button", "Buscar e Adicionar Alimento ou Receita").click()
      assertPickerLayoutAndTouchTargets()
      cy.contains("button", "Add").click()
      cy.contains("button", "Finalizar").click()
      cy.wait("@saveDiet")
    }
  })
})
