const PROFESSIONAL_AREAS = [
  {
    name: "Nutricionista",
    description:
      "Organize sua base de clientes e conduza o trabalho nutricional em um workspace dedicado.",
  },
  {
    name: "Personal Trainer",
    description:
      "Mantenha clientes e contexto de atendimento reunidos para planejar sua rotina de treinamento.",
  },
  {
    name: "Fisioterapeuta",
    description:
      "Acompanhe sua base de clientes em um workspace voltado ao cuidado fisioterapêutico.",
  },
] as const

export function ProfessionalAreas() {
  return (
    <section
      aria-labelledby="professional-areas-title"
      className="mx-auto w-full max-w-[76rem] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28"
    >
      <div className="max-w-[42rem]">
        <h2
          id="professional-areas-title"
          className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl"
        >
          Um produto, três atuações profissionais
        </h2>
        <p className="mt-4 max-w-[65ch] leading-7 text-[var(--sm-muted)]">
          A mesma fundação de trabalho, com linguagem e caminhos coerentes
          para a atuação escolhida.
        </p>
      </div>

      <div className="mt-10 border-y border-[var(--sm-border)] md:grid md:grid-cols-3 md:divide-x md:divide-[var(--sm-border)]">
        {PROFESSIONAL_AREAS.map((area) => (
          <article
            key={area.name}
            className="border-b border-[var(--sm-border)] py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
          >
            <h3 className="text-lg font-semibold tracking-[-0.015em]">
              {area.name}
            </h3>
            <p className="mt-3 leading-7 text-[var(--sm-muted)]">
              {area.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
