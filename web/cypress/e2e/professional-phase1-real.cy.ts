const credentials = {
  NUTRITIONIST: {
    area: "Área de Nutrição",
    allowed: /planos alimentares|alimentos/i,
    denied: /planilhas|reabilitação/i,
  },
  PERSONAL: {
    area: "Área de Treinamento",
    allowed: /planilhas/i,
    denied: /planos alimentares|alimentos|reabilitação/i,
  },
  PHYSIO: {
    area: "Área de Fisioterapia",
    allowed: /reabilitação/i,
    denied: /planos alimentares|alimentos|planilhas/i,
  },
} as const

describe("SafeMove professional phase one over real HTTP", () => {
  it("registers, logs in, hydrates and logs out through the visible UI", () => {
    const email = `new-professional-${Date.now()}@e2e.test`

    cy.visit("/auth/register")
    cy.findByLabelText("Nutricionista").click()
    cy.findByLabelText("Nome completo").type("Profissional Nova")
    cy.findByLabelText("E-mail").type(email)
    cy.findByLabelText("Senha").type("SafeMove-E2E-2026!", { log: false })
    cy.findByRole("button", { name: "Criar conta" }).click()

    cy.location("pathname", { timeout: 20_000 }).should("eq", "/auth/login")
    cy.findByLabelText("E-mail").type(email)
    cy.findByLabelText("Senha").type("SafeMove-E2E-2026!", { log: false })
    cy.findByRole("button", { name: "Entrar" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/home")
    cy.findAllByText("Base privada · somente sua conta")
      .filter(":visible")
      .should("have.length", 1)

    cy.reload()
    cy.findByRole("button", { name: "Abrir menu da conta" }).should("contain.text", "Profissional Nova")
    cy.findByRole("button", { name: "Abrir menu da conta" }).click()
    cy.findByRole("button", { name: "Sair" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/auth/login")
  })

  Object.entries(credentials).forEach(([role, account]) => {
    it(`shows only the ${role} workspace`, () => {
      cy.loginAs(role as keyof typeof credentials)
      cy.findByRole("complementary", { name: account.area }).should("be.visible")
      cy.findByRole("navigation", { name: "Navegação principal" }).within(() => {
        cy.contains(account.allowed).should("exist")
        cy.contains(account.denied).should("not.exist")
      })
    })
  })

  it("renders the nutritionist dashboard from seeded client data", () => {
    cy.loginAs("NUTRITIONIST")
    cy.findByRole("region", { name: "Resumo da base" }).within(() => {
      cy.findByText("Clientes ativos").should("be.visible")
      cy.findByText("1").should("be.visible")
    })
    cy.findByRole("link", { name: /abrir prontuário de cliente privado a/i }).should("be.visible")
  })

  it("creates, edits, archives and restores a client", () => {
    // The production API intentionally allows 20 requests per minute per IP.
    // Start the mutation-heavy half of this real journey in a fresh window.
    cy.wait(61_000)
    cy.loginAs("NUTRITIONIST")
    cy.findByRole("link", { name: /novo cliente/i }).click()
    cy.findByLabelText("Nome completo").type("Cliente Jornada Real")
    cy.findByLabelText("E-mail").type("client-journey@e2e.test")
    cy.findByRole("button", { name: "Salvar cliente" }).click()

    cy.location("pathname", { timeout: 20_000 }).should("eq", "/clientes")
    cy.findByRole("link", { name: "Abrir prontuário de Cliente Jornada Real" }).click()
    cy.findByLabelText("Nome completo").clear().type("Cliente Jornada Atualizada")
    cy.findByRole("button", { name: "Salvar alterações no prontuário" }).click()
    cy.findByText("Prontuário atualizado com sucesso.").should("be.visible")
    cy.get("[data-sonner-toast]", { timeout: 10_000 }).should("not.exist")

    cy.findByRole("button", { name: /arquivar cliente cliente jornada atualizada/i }).click()
    cy.findByRole("button", { name: "Confirmar arquivamento" }).click()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/clientes")

    cy.visit("/clientes?status=ARCHIVED")
    cy.findByRole("link", { name: "Abrir prontuário de Cliente Jornada Atualizada" }).should("be.visible")
    cy.findByRole("button", { name: /restaurar cliente cliente jornada atualizada/i }).click()
    cy.findByRole("button", { name: "Confirmar restauração" }).click()
    cy.findByText("Cliente restaurado com sucesso.").should("be.visible")

    cy.visit("/clientes")
    cy.findByRole("link", { name: "Abrir prontuário de Cliente Jornada Atualizada" }).should("be.visible")
  })

  it("hides tenant B and returns not found on its direct URL", () => {
    cy.loginAs("NUTRITIONIST")
    cy.visit("/clientes")
    cy.contains("Cliente privado B").should("not.exist")

    cy.visit("/clientes/41000000-0000-4000-8000-000000000002", {
      failOnStatusCode: false,
    })
    cy.findByRole("heading", { name: "Prontuário não encontrado" }).should("be.visible")
  })

  it("does not persist authentication or clinical data in browser storage", () => {
    cy.loginAs("NUTRITIONIST")
    cy.visit("/clientes/41000000-0000-4000-8000-000000000001")
    cy.findByText("Cliente privado A").should("be.visible")

    cy.window().then((browserWindow) => {
      const persisted = [browserWindow.localStorage, browserWindow.sessionStorage]
        .flatMap((storage) => Array.from(
          { length: storage.length },
          (_, index) => {
            const key = storage.key(index)
            return key === null ? "" : `${key}=${storage.getItem(key)}`
          },
        ))
        .join("\n")

      expect(persisted).not.to.match(/access_token|csrf|Cliente privado A|diet_draft_/i)
    })
  })

  it("passes keyboard and axe checks on desktop and mobile", () => {
    cy.loginAs("PHYSIO")

    ;([[1440, 900], [390, 844]] as const).forEach(([width, height]) => {
      cy.viewport(width, height)
      cy.visit("/home")
      cy.injectAxe()
      cy.checkA11y(undefined, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      })
      cy.get("body").then(($body) => {
        const body = $body[0]
        body.setAttribute("tabindex", "-1")
        body.focus()
        body.removeAttribute("tabindex")
      })
      cy.realPress("Tab")
      cy.focused().should("have.attr", "href", "#conteudo-principal")
    })
  })

  it("clears rendered clinical state after session expiration", () => {
    cy.loginAs("NUTRITIONIST")
    cy.visit("/clientes/41000000-0000-4000-8000-000000000001")
    cy.findByText("Cliente privado A").should("be.visible")

    cy.clearCookie("access_token")
    cy.reload()
    cy.location("pathname", { timeout: 20_000 }).should("eq", "/auth/login")
    cy.contains("Cliente privado A").should("not.exist")
  })
})
