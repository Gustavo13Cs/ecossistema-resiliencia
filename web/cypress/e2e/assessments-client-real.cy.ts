describe("SafeMove Client assessments over real HTTP", () => {
  it("lists the private Client and records an assessment against its prontuário", () => {
    cy.loginAs("NUTRITIONIST")
    cy.visit("/avaliacoes")

    cy.findByRole("button", { name: "Nova Avaliação" }).click()
    cy.findByText("Cliente privado A").click()

    cy.findByRole("heading", { name: "Nova Avaliação Corporal" }).should("be.visible")
    cy.findByLabelText(/Peso \(kg\)/).type("72.4")
    cy.findByRole("button", { name: "Salvar Avaliação" }).click()

    cy.findByText("Avaliação salva com sucesso!").should("be.visible")
    cy.findByRole("cell", { name: "Cliente privado A" }).should("be.visible")
    cy.findByRole("cell", { name: "72.4 kg" }).should("be.visible")
  })
})
