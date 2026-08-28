import Link from "next/link"
import { ArrowRight, LockKeyhole } from "lucide-react"
import { ProfessionalAreas } from "@/components/marketing/ProfessionalAreas"

const primaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-5 py-3 text-sm font-semibold text-[var(--sm-on-brand)] shadow-[var(--sm-shadow-rest)] transition-colors hover:bg-[var(--sm-brand-hover)]"

const secondaryAction =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-5 py-3 text-sm font-semibold text-[var(--sm-ink)] transition-colors hover:bg-[var(--sm-canvas)]"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--sm-canvas)] text-[var(--sm-ink)]">
      <header className="border-b border-[var(--sm-border)] bg-[var(--sm-surface)]">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex min-h-16 w-full max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-lg font-bold tracking-[-0.02em]"
          >
            SafeMove
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)]"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className={`${primaryAction} hidden sm:inline-flex`}
            >
              Criar conta profissional
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[76rem] gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center lg:px-8 lg:py-28">
          <div className="max-w-[44rem]">
            <h1 className="max-w-[14ch] text-balance text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Seu trabalho clínico, em uma base privada
            </h1>
            <p className="mt-6 max-w-[62ch] text-lg leading-8 text-[var(--sm-muted)]">
              O SafeMove organiza clientes e prontuários para Nutricionistas,
              Personal Trainers e Fisioterapeutas trabalharem com clareza em
              sua própria conta profissional.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/register" className={primaryAction}>
                Criar conta profissional
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/auth/login" className={secondaryAction}>
                Entrar
              </Link>
            </div>
          </div>

          <div className="relative border-y border-[var(--sm-border)] bg-[var(--sm-surface)] px-6 py-8 sm:px-8 lg:border lg:shadow-[var(--sm-shadow-elevated)]">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]">
                <LockKeyhole aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">
                  Sua base profissional
                </h2>
                <p className="mt-2 leading-7 text-[var(--sm-muted)]">
                  Cada cliente fica vinculado à conta profissional que criou o
                  prontuário.
                </p>
              </div>
            </div>
            <dl className="mt-8 divide-y divide-[var(--sm-border)] border-y border-[var(--sm-border)]">
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-[var(--sm-muted)]">Workspace</dt>
                <dd className="text-sm font-semibold">Uma atuação por conta</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-[var(--sm-muted)]">Prontuários</dt>
                <dd className="text-sm font-semibold">Base privada de clientes</dd>
              </div>
            </dl>
          </div>
        </section>

        <ProfessionalAreas />

        <section className="border-y border-[var(--sm-border)] bg-[var(--sm-surface)]">
          <div className="mx-auto grid w-full max-w-[76rem] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8 lg:py-20">
            <h2 className="max-w-[18ch] text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              O prontuário começa pelo profissional
            </h2>
            <div className="max-w-[66ch]">
              <p className="text-lg leading-8 text-[var(--sm-muted)]">
                Cadastre, consulte, atualize, arquive e restaure clientes em uma
                base vinculada à sua conta. O acesso ao workspace respeita a
                atuação escolhida no cadastro.
              </p>
              <Link
                href="/auth/register"
                className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--sm-brand)] underline decoration-[var(--sm-border)] decoration-2 transition-colors hover:text-[var(--sm-brand-hover)]"
              >
                Começar com uma conta profissional
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[var(--sm-ink)] text-[var(--sm-on-brand)]">
          <div className="mx-auto flex w-full max-w-[76rem] flex-col items-start justify-between gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em]">
                Abra seu workspace profissional
              </h2>
              <p className="mt-3 max-w-[55ch] text-[var(--sm-inverse-muted)]">
                Escolha sua atuação e comece a organizar sua base privada de
                clientes.
              </p>
            </div>
            <Link
              href="/auth/register"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--sm-radius-sm)] bg-[var(--sm-surface)] px-5 py-3 text-sm font-semibold text-[var(--sm-ink)] transition-colors hover:bg-[var(--sm-subtle-hover)]"
            >
              Criar conta profissional
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--sm-ink)] px-4 pb-8 text-sm text-[var(--sm-inverse-muted)] sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[76rem] border-t border-[var(--sm-inverse-border)] pt-6">
          SafeMove · Workspace profissional
        </div>
      </footer>
    </div>
  )
}
