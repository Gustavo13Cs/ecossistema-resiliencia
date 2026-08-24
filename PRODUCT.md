# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

SafeMove atende, com igual protagonismo, profissionais autônomos ou ligados a consultórios e estúdios nas funções de Nutricionista, Personal Trainer e Fisioterapeuta. Cada profissional usa o produto para manter uma base privada de clientes, consultar prontuários e executar os fluxos clínicos ou de treinamento compatíveis com sua atuação.

## Product Purpose

SafeMove centraliza a gestão profissional de clientes, avaliações, dados clínicos e prescrições de nutrição, treinamento e fisioterapia. O produto deve reduzir a fragmentação do trabalho diário, tornar o estado de cada cliente rapidamente compreensível e preservar a privacidade dos prontuários.

O sucesso do produto significa permitir que cada profissional encontre um cliente, compreenda seu contexto e conclua uma ação relevante com segurança, sem enxergar dados pertencentes a outra conta profissional.

## Positioning

Uma única fundação profissional-first adapta terminologia, navegação e ações à atuação escolhida no cadastro, mantendo o mesmo sistema de produto para Nutricionistas, Personal Trainers e Fisioterapeutas. A base privada de `Client` pertence à conta profissional; identidade autenticável e prontuário não são tratados como a mesma entidade.

Cada atuação possui um workspace próprio. Nutricionistas não recebem navegação ou conteúdo de treinamento e fisioterapia; Personal Trainers não recebem conteúdo de nutrição e fisioterapia; Fisioterapeutas não recebem conteúdo de nutrição e treinamento. Elementos de outras atuações devem ser removidos ou substituídos por informação operacional relevante ao perfil autenticado.

## Operating Context

- Cadastro e autenticação de uma conta com uma única atuação profissional.
- Gestão de clientes ativos e arquivados em uma base privada por profissional.
- Consulta do prontuário e do histórico disponível para cada cliente.
- Criação e acompanhamento de avaliações e prescrições compatíveis com a profissão.
- Uso frequente em desktop durante atendimento e planejamento, com acesso responsivo em dispositivos móveis.
- Impressão e compartilhamento manual aparecem em alguns fluxos existentes, mas a evolução desses mecanismos ainda faz parte da migração do produto.

## Capabilities and Constraints

- A aplicação web usa Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query e Cypress; a API usa NestJS, Prisma e PostgreSQL.
- A fundação atual oferece cadastro profissional e CRUD, arquivamento, restauração e isolamento por proprietário para prontuários `Client`.
- Nutrição, treinamento, fisioterapia, avaliações e outros recursos clínicos existem em diferentes níveis de maturidade e ainda contêm integrações com modelos e terminologia legados de paciente.
- Navegação, dados, indicadores e ações devem respeitar simultaneamente a profissão autenticada e a propriedade do prontuário. Ocultar uma opção no frontend não substitui a autorização equivalente na API.
- O redesign será entregue em fases. A primeira fase abrange design system, navegação, autenticação, dashboard e gestão de clientes. As fases seguintes cobrem dietas, treinos, avaliações, fisioterapia e demais fluxos clínicos.
- Nenhuma informação sintética, aproximada ou indisponível deve ser apresentada como métrica clínica real.
- Segurança no frontend complementa, mas não substitui, autorização na API. Acesso a dados clínicos depende de autenticação e de validação de propriedade ou vínculo no servidor.
- Dados clínicos sensíveis não devem ser persistidos no navegador sem necessidade e sem uma decisão explícita de privacidade.
- Cada fase deve encerrar com testes automatizados no ciclo Red, Green e Refactor e validação E2E real com Cypress, navegador, frontend, API e PostgreSQL, sem mocks nos fluxos principais.

## Brand Commitments

- Preservar somente o nome `SafeMove`.
- Reconstruir integralmente a identidade visual; cores, tipografia, componentes e convenções visuais atuais não são obrigatórios.
- A voz deve ser profissional, clara e confiável, sem alegações clínicas, comerciais ou de segurança que o produto não consiga comprovar.
- A direção escolhida é um SaaS clínico contemporâneo executado com alto rigor, sem depender de metáforas visuais experimentais.
- Referências de acabamento: Linear para velocidade e hierarquia de workspace; Stripe Dashboard para navegação por recursos, busca e estados operacionais; Cliniko para a relação prática entre agenda e prontuário. São referências de qualidade e comportamento, não modelos para copiar identidade ou escopo funcional.

## Evidence on Hand

- O repositório contém o frontend, a API, o schema de dados, testes unitários e testes Cypress existentes.
- O `README.md` descreve a fundação professional-first e distingue funcionalidades concluídas de fases futuras.
- A captura fornecida pelo usuário registra o dashboard atual como referência do estado anterior, não como direção visual obrigatória.
- Não há logotipo ou outro ativo visual obrigatório além do nome SafeMove.
- Não há depoimentos, benchmarks comerciais ou comprovação externa que possam ser apresentados como fatos no novo frontend.

## Product Principles

1. Um produto, três atuações profissionais igualmente respeitadas.
2. Cada profissional vê somente o domínio, os dados e as ações pertinentes à própria atuação.
3. O trabalho e o contexto do cliente vêm antes da decoração do dashboard.
4. Dados reais, estados honestos e ações seguras substituem métricas de aparência.
5. Privacidade e autorização são partes visíveis da experiência, não detalhes tardios.
6. A modernização avança em fases verificáveis sem consolidar fluxos legados como destino final.

## Accessibility & Inclusion

O frontend deve atender WCAG 2.2 nível AA. Isso inclui operação por teclado, foco visível, contraste adequado, semântica compatível com leitores de tela, alvos de toque apropriados, suporte a redução de movimento e comportamento responsivo de celular a desktop.
