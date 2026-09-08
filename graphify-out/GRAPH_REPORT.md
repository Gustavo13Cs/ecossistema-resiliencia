# Graph Report - safemove-professional-frontend-phase-1  (2026-09-04)

## Corpus Check
- 341 files · ~484,443 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2521 nodes · 4690 edges · 229 communities (117 shown, 93 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88550953`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- auth.controller.ts
- ClientsService
- agenda.controller.ts
- sidebar.tsx
- api.ts
- UsersService
- Design: Agenda Diária Integrada
- AgendaTaskDialog.tsx
- DietPlansService
- hooks/ui/use-toast.ts
- PrismaService
- direction-contract-artifacts.mjs
- RehabPlansService
- WorkoutsService
- SafeMove profissional-first e prontuário de cliente
- Roles
- ConsultationNotesService
- FoodsService
- button.tsx
- CreateWorkoutLogDto
- AssessmentsService
- Design: Autorização e Testes de Segurança — Fase 1
- useAuth
- app.module.ts
- AuthUser
- MealLogsService
- AssessmentModal.tsx
- nova-dieta/page.tsx
- CreateLabExamDto
- compilerOptions
- ClientDirectory.test.tsx
- CreateAnamnesisDto
- professional-workspace.ts
- Design: Fase 1 de Performance — Cache e Redução do Bundle
- ClientForm.tsx
- PatientAgendaSummary.tsx
- dependencies
- MetricsService
- PhysioAssessmentsService
- health-check-ins.controller.ts
- supplements.module.ts
- compilerOptions
- useProfessionalDashboard.test.tsx
- field.tsx
- File Map
- File map
- register/page.tsx
- auth.ts
- components.json
- AgendaController
- menubar.tsx
- context-menu.tsx
- dropdown-menu.tsx
- dependencies
- devDependencies
- [id]/page.tsx
- ConsentsService
- carousel.tsx
- jest
- scripts
- Global Constraints
- Tarefa 1 — Gates frontend e política tipada de workspace
- item.tsx
- SafeMove: redesign profissional do frontend
- Product
- form.tsx
- scripts
- 🏥 Ecossistema Resiliência
- chart.tsx
- select.tsx
- dietas/page.tsx
- api/README.md
- clients.e2e-spec.ts
- occurrence-generator.ts
- pagination.tsx
- api/package.json
- devDependencies
- drawer.tsx
- Global Constraints
- 🚀 Como Instalar & Executar
- novo/page.tsx
- JwtStrategy
- exclude
- Database Migration Baseline
- Global Constraints
- Home profissional
- 📋 Funcionalidades Principais (MVP)
- empty.tsx
- seed.ts
- AlertsController
- 7.1 Superfícies públicas
- toggle-group.tsx
- AppController
- nest-cli.json
- query-client.ts
- 2. Problemas confirmados no estado atual
- 🗄️ Modelo de Dados (Resumo)
- usePacienteDashboard.ts
- create-users.ts
- CreateSupplementDto
- 11. Segurança e privacidade
- 6. Direção visual
- 🐛 Troubleshooting
- useCalculoEnergetico.ts
- clientes-page.test.tsx
- alert.tsx
- performance-cache.cy.ts
- accordion.tsx
- 13. Estratégia Red, Green e Refactor
- 14. Camadas de teste
- 8. Superfícies da primeira fase
- 9. Componentes e limites
- 🔒 Segurança & Boas Práticas
- utils.ts
- web/package.json
- postcss.config.mjs
- 📝 Scripts Úteis
- 🎯 O Problema & A Solução
- 🛣️ Roadmap (Em Discussão)
- web/eslint.config.mjs
- @types/supertest
- eslint
- @eslint/eslintrc
- @eslint/js
- @nestjs/cli
- @nestjs/schematics
- @nestjs/testing
- prettier
- ts-jest
- ts-loader
- ts-node
- @types/bcrypt
- @types/cookie-parser
- @types/express
- @types/jest
- @types/node
- @types/pg
- typescript-eslint
- health-check-ins.module.ts
- axios
- class-variance-authority
- clsx
- cmdk
- cypress
- cypress-axe
- cypress-real-events
- date-fns
- CODEX_STATUS.md
- embla-carousel-react
- eslint-config-next
- @hookform/resolvers
- input-otp
- jsdom
- jwt-decode
- lucide-react
- next-themes
- postcss
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-tooltip
- react-dom
- react-hook-form
- react-resizable-panels
- recharts
- sonner
- tailwind-merge
- tailwindcss-animate
- @tailwindcss/postcss
- @tanstack/react-query
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- tw-animate-css
- @types/react
- @types/validator
- validator
- vaul
- @vercel/analytics
- vite
- vite-tsconfig-paths
- @vitest/coverage-v8
- next.config.mjs
- next
- zod
- eslint
- @types/node
- typescript

## God Nodes (most connected - your core abstractions)
1. `cn()` - 277 edges
2. `PrismaService` - 65 edges
3. `Roles()` - 58 edges
4. `useAuth()` - 47 edges
5. `api` - 43 edges
6. `Button()` - 36 edges
7. `AuthUser` - 34 edges
8. `JwtAuthGuard` - 27 edges
9. `RolesGuard` - 25 edges
10. `AgendaService` - 25 edges

## Surprising Connections (you probably didn't know these)
- `AssessmentModal()` --calls--> `useAuth()`  [EXTRACTED]
  web/components/AssessmentModal.tsx → web/contexts/auth-context.tsx
- `SportSelector()` --calls--> `useAuth()`  [EXTRACTED]
  web/components/sport-selector.tsx → web/contexts/auth-context.tsx
- `AccordionItem()` --calls--> `cn()`  [EXTRACTED]
  web/components/ui/accordion.tsx → web/lib/utils.ts
- `AccordionTrigger()` --calls--> `cn()`  [EXTRACTED]
  web/components/ui/accordion.tsx → web/lib/utils.ts
- `AccordionContent()` --calls--> `cn()`  [EXTRACTED]
  web/components/ui/accordion.tsx → web/lib/utils.ts

## Import Cycles
- None detected.

## Communities (229 total, 93 thin omitted)

### Community 0 - "cn"
Cohesion: 0.06
Nodes (42): Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+34 more)

### Community 1 - "auth.controller.ts"
Cohesion: 0.05
Nodes (45): IS_PUBLIC_KEY, Public(), AuthGuard, Injectable, assertCsrfPair(), createCsrfProtection(), generateCsrfToken(), isValidCsrfToken() (+37 more)

### Community 2 - "ClientsService"
Cohesion: 0.05
Nodes (39): ClientsController, Body, Controller, Get, Param, Patch, Post, Query (+31 more)

### Community 3 - "agenda.controller.ts"
Cohesion: 0.07
Nodes (33): AuthenticatedRequest, CLINICAL_ROLES, AgendaScheduler, Cron, Injectable, addUtcDays(), AgendaService, AgendaTaskSchedule (+25 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.06
Nodes (40): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle(), Sidebar() (+32 more)

### Community 5 - "api.ts"
Cohesion: 0.08
Nodes (28): inter, metadata, RootLayout(), FisioPacientePage(), navigation, users, LayoutWrapper(), allowedRoles (+20 more)

### Community 6 - "UsersService"
Cohesion: 0.07
Nodes (25): CreateUserDto, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength (+17 more)

### Community 7 - "Design: Agenda Diária Integrada"
Cohesion: 0.05
Nodes (42): 10. APIs conceituais, 11. Notificações, 12. Tratamento de erros, 13. Concorrência, recorrência e tempo, 14. Testes e critérios de aceite, 15. Ordem de entrega, 16. Riscos e mitigação, 17. Resultado esperado (+34 more)

### Community 8 - "AgendaTaskDialog.tsx"
Cohesion: 0.09
Nodes (33): AgendaTaskCardProps, categoryLabels, statusLabels, AgendaTaskDialog(), AgendaTaskDialogProps, AgendaTaskPayload, dateInTimeZone(), detectedTimeZone() (+25 more)

### Community 9 - "DietPlansService"
Cohesion: 0.09
Nodes (22): DietPlansController, Body, Controller, Delete, Get, Param, Patch, Post (+14 more)

### Community 10 - "hooks/ui/use-toast.ts"
Cohesion: 0.08
Nodes (38): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+30 more)

### Community 11 - "PrismaService"
Cohesion: 0.08
Nodes (17): ClientAccessService, Injectable, PrismaService, Injectable, AlertsCronService, Cron, Injectable, AlertsModule (+9 more)

### Community 12 - "direction-contract-artifacts.mjs"
Cohesion: 0.14
Nodes (18): DirectionContract(), DIRECTION_CONTRACT_COMMENT, DIRECTION_CONTRACT_HTML, DIRECTION_CONTRACT_ID, DIRECTION_CONTRACT_IDENTITY_ATTRIBUTE, DIRECTION_CONTRACT_TEMPLATE_START, artifactsRoot, result (+10 more)

### Community 13 - "RehabPlansService"
Cohesion: 0.09
Nodes (21): CreateRehabExerciseDto, CreateRehabPlanDto, CreateRehabSessionDto, IsArray, IsNumber, IsOptional, IsString, Type (+13 more)

### Community 14 - "WorkoutsService"
Cohesion: 0.09
Nodes (21): CreateExerciseDto, CreateSplitDto, CreateWorkoutDto, IsArray, IsNumber, IsOptional, IsString, Type (+13 more)

### Community 15 - "SafeMove profissional-first e prontuário de cliente"
Cohesion: 0.05
Nodes (36): 10. Modelos reutilizáveis, 11. PDFs e compartilhamento, 12.1 Auditoria mínima, 12. Arquivamento e retenção, 13. Tratamento de erros, 14.1 Fase 1 — Fundação profissional, 14.2 Fase 2 — Planos e documentos, 14.3 Fase 3 — Ferramenta diária (+28 more)

### Community 16 - "Roles"
Cohesion: 0.20
Nodes (10): Roles(), ROLES_KEY, JwtAuthGuard, Injectable, RolesGuard, Injectable, AuthenticatedRequest, IsEnum (+2 more)

### Community 17 - "ConsultationNotesService"
Cohesion: 0.09
Nodes (19): ConsultationNotesController, Body, Controller, Delete, Get, Param, Patch, Post (+11 more)

### Community 18 - "FoodsService"
Cohesion: 0.10
Nodes (16): CreateFoodDto, IsNumber, IsOptional, IsString, FoodsController, Body, Controller, Delete (+8 more)

### Community 19 - "button.tsx"
Cohesion: 0.19
Nodes (14): ExamesLaboratoriaisPage(), NovaSuplementacaoPage(), PainelUTI(), ConsentStatusProps, SportSelector(), Button(), Card(), CardContent() (+6 more)

### Community 20 - "CreateWorkoutLogDto"
Cohesion: 0.09
Nodes (23): CreateWorkoutLogDto, IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min (+15 more)

### Community 21 - "AssessmentsService"
Cohesion: 0.09
Nodes (16): AssessmentsController, Body, Controller, Delete, Get, Param, Post, Request (+8 more)

### Community 22 - "Design: Autorização e Testes de Segurança — Fase 1"
Cohesion: 0.06
Nodes (30): 10. Fora do escopo, 11. Fases seguintes, 12. Riscos e mitigação, 13. Ordem de implementação, 1. Contexto, 2.1 Paciente, 2.2 Profissional clínico, 2.3 Consentimento (+22 more)

### Community 23 - "useAuth"
Cohesion: 0.13
Nodes (18): ALERT_LABELS, formatDate(), formatDateShort(), Visao360Page(), ClientesPage(), normalizeSearch(), HomePage(), ProfessionalDashboard() (+10 more)

### Community 24 - "app.module.ts"
Cohesion: 0.12
Nodes (21): ClientAccessModule, Module, DatabaseModule, Module, AgendaModule, Module, AuthModule, Module (+13 more)

### Community 25 - "AuthUser"
Cohesion: 0.16
Nodes (7): PatientAccessService, Injectable, AuthUser, CLINICAL_PROFESSIONAL_ROLES, assertUtcRange(), CONSENT_CATEGORIES, ConsentView

### Community 26 - "MealLogsService"
Cohesion: 0.10
Nodes (18): CreateMealLogDto, MEAL_LOG_STATUS_VALUES, MealLogStatus, IsEnum, IsOptional, IsString, MealLogsController, Body (+10 more)

### Community 27 - "AssessmentModal.tsx"
Cohesion: 0.33
Nodes (7): AssessmentModal(), AssessmentModalProps, PhysioAssessmentModalProps, Tabs(), TabsContent(), TabsList(), TabsTrigger()

### Community 28 - "nova-dieta/page.tsx"
Cohesion: 0.07
Nodes (44): calculateAge(), CLIENT_GATE_ERRORS, getAutoDRI(), MacroDistributionChart, NovaDietaPage(), ClientListItem(), formatUpdatedAt(), ClientRecordHeader() (+36 more)

### Community 29 - "CreateLabExamDto"
Cohesion: 0.09
Nodes (20): CreateLabExamDto, MarkerDto, IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString (+12 more)

### Community 30 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.tsx, compilerOptions (+19 more)

### Community 31 - "ClientDirectory.test.tsx"
Cohesion: 0.10
Nodes (23): activeClient, http, navigation, session, ClientFilters(), ClientFiltersProps, ClientList(), ClientListProps (+15 more)

### Community 32 - "CreateAnamnesisDto"
Cohesion: 0.10
Nodes (17): AnamnesesController, Body, Controller, Get, Param, Post, Request, UseGuards (+9 more)

### Community 33 - "professional-workspace.ts"
Cohesion: 0.12
Nodes (27): ProfessionalRouteBoundary(), ProfessionalScopePanelProps, AppShell(), ROLE_LABELS, MobileNavigation(), MobileNavigationProps, NAVIGATION_ICONS, ProfessionalSidebar() (+19 more)

### Community 34 - "Design: Fase 1 de Performance — Cache e Redução do Bundle"
Cohesion: 0.09
Nodes (22): 10. Estados de interface e erros, 11. Dependências e arquivos conceituais, 12.1 Comportamento, 12.2 Verificação estática, 12.3 Comparação de produção, 12. Testes e evidências, 13. Critérios de aceite, 14. Riscos e mitigação (+14 more)

### Community 35 - "ClientForm.tsx"
Cohesion: 0.12
Nodes (19): ClientFieldGroup, ClientFieldName, getClientFieldGroups(), IDENTITY_FIELDS, PRIVATE_NOTE_FIELDS, ROLE_FIELDS, ROLE_GROUP_CONTENT, EXPECTED_FIELDS (+11 more)

### Community 36 - "PatientAgendaSummary.tsx"
Cohesion: 0.23
Nodes (8): AgendaProgress(), AgendaProgressProps, categoryLabels, PatientAgendaSummaryProps, Badge(), badgeVariants, AgendaDay, AgendaTask

### Community 37 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, bcrypt, class-transformer, class-validator, cookie-parser, dotenv, @nestjs/common, @nestjs/core (+33 more)

### Community 38 - "MetricsService"
Cohesion: 0.14
Nodes (10): MetricsController, Body, Controller, Get, Param, Post, MetricsModule, Module (+2 more)

### Community 39 - "PhysioAssessmentsService"
Cohesion: 0.10
Nodes (15): CreatePhysioAssessmentDto, IsNumber, IsOptional, IsString, PhysioAssessmentsController, Body, Controller, Delete (+7 more)

### Community 40 - "health-check-ins.controller.ts"
Cohesion: 0.08
Nodes (26): AgendaRangeQueryDto, IsValidAgendaRange(), IsISO8601, CreateHealthCheckInDto, IsInt, IsISO8601, IsOptional, IsString (+18 more)

### Community 41 - "supplements.module.ts"
Cohesion: 0.12
Nodes (12): SupplementsController, Body, Controller, Get, Param, Post, Request, UseGuards (+4 more)

### Community 42 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+11 more)

### Community 43 - "useProfessionalDashboard.test.tsx"
Cohesion: 0.23
Nodes (8): classifyErrors(), PRIVATE_UNAVAILABLE_STATUS_CODES, ProfessionalDashboardStatus, sortRecentClients(), authState, http, renderDashboardHook(), useProfessionalDashboard()

### Community 44 - "field.tsx"
Cohesion: 0.13
Nodes (16): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Field(), FieldContent(), FieldDescription(), FieldError() (+8 more)

### Community 45 - "File Map"
Cohesion: 0.11
Nodes (17): Agenda Diária Core Implementation Plan, Backend, Banco e infraestrutura, File Map, Follow-up Plans, Frontend, Global Constraints, Task 10: Verify the Complete Core Journey on the Local Database (+9 more)

### Community 46 - "File map"
Cohesion: 0.11
Nodes (17): File map, Fundação e política de workspace, Global Constraints, SafeMove Professional Frontend Phase 1 Implementation Plan, Segurança de sessão, Superfícies, Task 10: Apply browser headers, finish the comp-led review and close every gate, Task 1: Restore frontend quality gates and define the workspace policy (+9 more)

### Community 47 - "register/page.tsx"
Cohesion: 0.11
Nodes (18): auth, navigation, LoginField, LoginFieldErrors, LoginPage(), LoginPageError, toAuthMessage(), toLoginPageError() (+10 more)

### Community 48 - "auth.ts"
Cohesion: 0.10
Nodes (12): http, navigation, session, validDraft, http, navigation, record, session (+4 more)

### Community 49 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 50 - "AgendaController"
Cohesion: 0.16
Nodes (14): AgendaController, Body, Controller, Get, Param, Patch, Post, Query (+6 more)

### Community 51 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 52 - "context-menu.tsx"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 53 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 54 - "dependencies"
Cohesion: 0.13
Nodes (15): autoprefixer, @radix-ui/react-toast, @radix-ui/react-toggle-group, react, react-day-picker, @supabase/ssr, @supabase/supabase-js, dependencies (+7 more)

### Community 55 - "devDependencies"
Cohesion: 0.13
Nodes (15): axe-core, axios-mock-adapter, tailwindcss, @testing-library/cypress, @types/react-dom, @vitejs/plugin-react, vitest, devDependencies (+7 more)

### Community 56 - "[id]/page.tsx"
Cohesion: 0.12
Nodes (20): http, record, router, ClienteHubPage(), ERROR_STATES, isProfessionalRole(), ClientFormPayload, ClientOverviewSection() (+12 more)

### Community 57 - "ConsentsService"
Cohesion: 0.12
Nodes (12): ConsentsController, Body, Controller, Get, Param, Put, Request, UseGuards (+4 more)

### Community 58 - "carousel.tsx"
Cohesion: 0.19
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 59 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 60 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 61 - "Global Constraints"
Cohesion: 0.15
Nodes (12): Fundação Profissional e Clientes Implementation Plan, Global Constraints, Task 10: Validar a Fase 1 e documentar a transição, Task 1: Adicionar o domínio persistente de clientes, Task 2: Centralizar autorização de propriedade do cliente, Task 3: Implementar serviço de clientes, DTOs e auditoria, Task 4: Expor a API `/clients` com validação HTTP, Task 5: Restringir novos cadastros a uma única atuação profissional (+4 more)

### Community 62 - "Tarefa 1 — Gates frontend e política tipada de workspace"
Cohesion: 0.15
Nodes (12): Arquivos, Comandos e resultados finais, Concerns, Concerns atualizados, Evidência TDD, Fix Round 1, Implementação e arquivos, Mudanças (+4 more)

### Community 63 - "item.tsx"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 64 - "SafeMove: redesign profissional do frontend"
Cohesion: 0.17
Nodes (11): 10. Fluxo de dados, 12. Acessibilidade e responsividade, 15. Gate de conclusão, 16. Sequenciamento conceitual, 17. Critérios de aceitação, 18. Decisões fechadas, 1. Resumo, 3. Objetivos (+3 more)

### Community 65 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 66 - "form.tsx"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 67 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, lint, postbuild, start, test (+4 more)

### Community 68 - "🏥 Ecossistema Resiliência"
Cohesion: 0.18
Nodes (11): Backend (`api/.env`), 📞 Contato & Suporte, 🤝 Contribuindo, ⭐ Créditos, 🏥 Ecossistema Resiliência, 🗂️ Estrutura do Projeto, Frontend (`web/.env.local`), 📄 Licença (+3 more)

### Community 69 - "chart.tsx"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 70 - "select.tsx"
Cohesion: 0.18
Nodes (7): SelectContent(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger()

### Community 71 - "dietas/page.tsx"
Cohesion: 0.27
Nodes (13): AvaliacoesHubPage(), DietasHubPage(), TreinosHubPage(), ConsistencyBadge(), ConsistencyBadgeProps, Input(), Table(), TableBody() (+5 more)

### Community 72 - "api/README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 73 - "clients.e2e-spec.ts"
Cohesion: 0.20
Nodes (6): AppModule, Module, ClientResponse, FIXTURE_USER_IDS, TestJwtAuthGuard, TestRequest

### Community 74 - "occurrence-generator.ts"
Cohesion: 0.38
Nodes (8): assertValidDate(), assertValidInput(), createTimeZoneFormatter(), generateOccurrenceDates(), GenerateOccurrenceInput, parseRecurrenceRule(), toWallClockDate(), validateRecurrenceRule()

### Community 75 - "pagination.tsx"
Cohesion: 0.19
Nodes (10): buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent(), PaginationEllipsis(), PaginationLink(), PaginationLinkProps (+2 more)

### Community 76 - "api/package.json"
Cohesion: 0.22
Nodes (8): author, description, license, name, prisma, seed, private, version

### Community 77 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, eslint-config-prettier, eslint-plugin-prettier, globals, jest, prisma, source-map-support (+15 more)

### Community 78 - "drawer.tsx"
Cohesion: 0.18
Nodes (6): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 79 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Cache e Redução do Bundle — Fase 1 Implementation Plan, Global Constraints, Task 1: Provar e implementar o cache compartilhado de usuários, Task 2: Isolar o cache por sessão, Task 3: Cachear a ficha e invalidar suas gravações, Task 4: Migrar dieta, visão 360, alertas e agenda, Task 5: Carregar os gráficos sob demanda, Task 6: Verificação integral e handoff

### Community 80 - "🚀 Como Instalar & Executar"
Cohesion: 0.22
Nodes (9): 1️⃣ Clone o Repositório, 2️⃣ Setup do Banco de Dados, 3️⃣ Setup do Backend (API), 4️⃣ Setup do Frontend (Web), 🚀 Como Instalar & Executar, Opção A: PostgreSQL Local, Opção B: Docker (Recomendado), Pré-requisitos (+1 more)

### Community 81 - "novo/page.tsx"
Cohesion: 0.22
Nodes (7): NovoClientePage(), AsyncState(), AsyncStateProps, STATE_ICONS, authState, navigation, ROLE_CASES

### Community 83 - "exclude"
Cohesion: 0.25
Nodes (7): exclude, extends, node_modules, dist, **/*spec.ts, test, ./tsconfig.json

### Community 84 - "Database Migration Baseline"
Cohesion: 0.25
Nodes (6): Adicionar uma nova migration no futuro, Banco de testes e2e (porta 5434), Contexto, Database Migration Baseline, Estratégia de startup automático (docker-compose), Por que "deploy primeiro"?

### Community 85 - "Global Constraints"
Cohesion: 0.25
Nodes (7): Autorização e Testes de Segurança — Fase 1 Implementation Plan, Global Constraints, Task 1: Centralizar a autorização de leitura do paciente, Task 2: Autorizar o `MetricsService` antes do Prisma, Task 3: Proteger o controller e comprovar a barreira HTTP, Task 4: Remover `patientId` do payload do frontend, Task 5: Verificação completa e handoff

### Community 86 - "Home profissional"
Cohesion: 0.25
Nodes (7): Audience and job, Chosen direction, Constraints, Home profissional, Primary action and content, Scope and mode, Unresolved decisions

### Community 87 - "📋 Funcionalidades Principais (MVP)"
Cohesion: 0.25
Nodes (8): 📊 Alertas & Monitoramento, 📈 Analytics (Phase 2), 📋 Funcionalidades Principais (MVP), 👩‍⚕️ Fundação profissional (Fase 1), 🏥 Módulo Fisioterapia, 🥗 Módulo Nutrição, 💪 Módulo Personal Trainer, 🔄 Transição e fases seguintes

### Community 88 - "empty.tsx"
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 89 - "seed.ts"
Cohesion: 0.29
Nodes (5): adapter, PATIENTS_DATA, pool, prisma, PROFESSIONALS

### Community 90 - "AlertsController"
Cohesion: 0.29
Nodes (5): AlertsController, Controller, Get, Request, UseGuards

### Community 91 - "7.1 Superfícies públicas"
Cohesion: 0.29
Nodes (7): 7.1 Superfícies públicas, 7.2 App shell autenticado, 7.3 Matriz de navegação, 7. Arquitetura de informação, Cadastro, Landing, Login

### Community 92 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 93 - "AppController"
Cohesion: 0.40
Nodes (3): AppController, Controller, Get

### Community 94 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 95 - "query-client.ts"
Cohesion: 0.39
Nodes (6): QueryProvider(), createQueryClient(), QUERY_GC_TIME, QUERY_STALE_TIME, queryRetryDelay(), shouldRetryQuery()

### Community 96 - "2. Problemas confirmados no estado atual"
Cohesion: 0.33
Nodes (6): 2.1 Posicionamento e linguagem, 2.2 Dashboard e informação, 2.3 Separação por profissão, 2.4 Privacidade e segurança, 2.5 Qualidade e manutenção, 2. Problemas confirmados no estado atual

### Community 97 - "🗄️ Modelo de Dados (Resumo)"
Cohesion: 0.33
Nodes (6): Fisioterapia, Identidade profissional & Prontuários, 🗄️ Modelo de Dados (Resumo), Monitoramento, Nutrição, Treino

### Community 98 - "usePacienteDashboard.ts"
Cohesion: 0.33
Nodes (4): DietPlan, Meal, usePacienteDashboard(), UserData

### Community 99 - "create-users.ts"
Cohesion: 0.40
Nodes (3): adapter, pool, prisma

### Community 100 - "CreateSupplementDto"
Cohesion: 0.40
Nodes (4): CreateSupplementDto, IsArray, IsOptional, IsString

### Community 101 - "11. Segurança e privacidade"
Cohesion: 0.40
Nodes (5): 11.1 Sessão, 11.2 Autorização, 11.3 Armazenamento e logs, 11.4 Navegador e rede, 11. Segurança e privacidade

### Community 102 - "6. Direção visual"
Cohesion: 0.40
Nodes (5): 6.1 Referências de acabamento, 6.2 Linguagem, 6.3 Tokens iniciais, 6.4 Composição aprovada, 6. Direção visual

### Community 103 - "🐛 Troubleshooting"
Cohesion: 0.40
Nodes (5): Erro: "Banco não encontrado", Erro: "CORS bloqueado", Erro: "JWT Secret não configurado", Porta 3000/3001 já em uso, 🐛 Troubleshooting

### Community 104 - "useCalculoEnergetico.ts"
Cohesion: 0.67
Nodes (3): CalculoEnergeticoPage(), calculateAge(), useCalculoEnergetico()

### Community 106 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 108 - "accordion.tsx"
Cohesion: 0.40
Nodes (3): AccordionContent(), AccordionItem(), AccordionTrigger()

### Community 109 - "13. Estratégia Red, Green e Refactor"
Cohesion: 0.50
Nodes (4): 13.1 Red, 13.2 Green, 13.3 Refactor, 13. Estratégia Red, Green e Refactor

### Community 110 - "14. Camadas de teste"
Cohesion: 0.50
Nodes (4): 14. Camadas de teste, API, Cypress E2E real, Frontend unitário e integração

### Community 111 - "8. Superfícies da primeira fase"
Cohesion: 0.50
Nodes (4): 8.1 Dashboard, 8.2 Lista de clientes, 8.3 Prontuário, 8. Superfícies da primeira fase

### Community 112 - "9. Componentes e limites"
Cohesion: 0.50
Nodes (4): 9.1 Fundação, 9.2 Dashboard, 9.3 Clientes, 9. Componentes e limites

### Community 113 - "🔒 Segurança & Boas Práticas"
Cohesion: 0.50
Nodes (4): Autenticação & Autorização, Código, Database, 🔒 Segurança & Boas Práticas

### Community 115 - "utils.ts"
Cohesion: 0.08
Nodes (17): Checkbox(), HoverCardContent(), InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput() (+9 more)

### Community 116 - "web/package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 118 - "📝 Scripts Úteis"
Cohesion: 0.67
Nodes (3): Backend, Frontend, 📝 Scripts Úteis

### Community 119 - "🎯 O Problema & A Solução"
Cohesion: 0.67
Nodes (3): Nossa Abordagem, O Cenário, 🎯 O Problema & A Solução

### Community 120 - "🛣️ Roadmap (Em Discussão)"
Cohesion: 0.67
Nodes (3): Phase 2 (Q3-Q4 2026), Phase 3 (2027), 🛣️ Roadmap (Em Discussão)

### Community 158 - "health-check-ins.module.ts"
Cohesion: 0.33
Nodes (6): PatientAccessModule, Module, ConsentsModule, Module, HealthCheckInsModule, Module

## Knowledge Gaps
- **714 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+709 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **93 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `sidebar.tsx`, `AgendaTaskDialog.tsx`, `hooks/ui/use-toast.ts`, `button.tsx`, `AssessmentModal.tsx`, `nova-dieta/page.tsx`, `professional-workspace.ts`, `PatientAgendaSummary.tsx`, `field.tsx`, `menubar.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `carousel.tsx`, `item.tsx`, `form.tsx`, `chart.tsx`, `select.tsx`, `dietas/page.tsx`, `pagination.tsx`, `drawer.tsx`, `empty.tsx`, `toggle-group.tsx`, `alert.tsx`, `accordion.tsx`, `utils.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Roles()` connect `Roles` to `ClientsService`, `agenda.controller.ts`, `UsersService`, `health-check-ins.controller.ts`, `DietPlansService`, `RehabPlansService`, `WorkoutsService`, `ConsultationNotesService`, `AgendaController`, `CreateWorkoutLogDto`, `ConsentsService`, `MealLogsService`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `PrismaService` connect `PrismaService` to `auth.controller.ts`, `ClientsService`, `agenda.controller.ts`, `UsersService`, `DietPlansService`, `RehabPlansService`, `WorkoutsService`, `Roles`, `ConsultationNotesService`, `FoodsService`, `CreateWorkoutLogDto`, `AssessmentsService`, `app.module.ts`, `AuthUser`, `MealLogsService`, `CreateLabExamDto`, `CreateAnamnesisDto`, `MetricsService`, `PhysioAssessmentsService`, `health-check-ins.controller.ts`, `supplements.module.ts`, `ConsentsService`, `clients.e2e-spec.ts`, `AlertsController`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _714 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06386066763425254 - nodes in this community are weakly interconnected._
- **Should `auth.controller.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05029838022165388 - nodes in this community are weakly interconnected._
- **Should `ClientsService` be split into smaller, more focused modules?**
  _Cohesion score 0.05423728813559322 - nodes in this community are weakly interconnected._