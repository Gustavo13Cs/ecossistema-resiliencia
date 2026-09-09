"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import axios from "axios"
import Link from "next/link"
import { ArrowLeft, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

function toAuthMessage(error: unknown) {
  if (!axios.isAxiosError(error) || !error.response) {
    return "Não foi possível acessar o SafeMove agora. Tente novamente."
  }

  if (error.response.status === 401) {
    return "E-mail ou senha inválidos."
  }

  if (error.response.status === 429) {
    return "Muitas tentativas. Aguarde um momento e tente novamente."
  }

  if (error.response.status >= 500) {
    return "O SafeMove está indisponível no momento. Tente novamente."
  }

  return "Não foi possível entrar. Revise os dados e tente novamente."
}

type LoginFieldErrors = {
  email?: string
  password?: string
}

type LoginField = keyof LoginFieldErrors

type LoginPageError = {
  message: string
  fields: ReadonlyArray<LoginField>
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toLoginPageError(error: unknown): LoginPageError {
  const message = toAuthMessage(error)

  return {
    message,
    fields:
      axios.isAxiosError(error) && error.response?.status === 401
        ? ["email", "password"]
        : [],
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({})
  const [pageError, setPageError] = useState<LoginPageError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: LoginFieldErrors = {}

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) nextErrors.email = "Informe seu e-mail."
    else if (!EMAIL_SHAPE.test(normalizedEmail)) {
      nextErrors.email = "Informe um e-mail válido."
    }
    if (!password) nextErrors.password = "Informe sua senha."

    setFieldErrors(nextErrors)
    setPageError(null)
    if (Object.keys(nextErrors).length > 0) return

    setIsLoading(true)
    try {
      await api.post("/auth/login", { email: normalizedEmail, password })
      await login()
    } catch (error: unknown) {
      setPageError(toLoginPageError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: LoginField, value: string) => {
    if (field === "email") setEmail(value)
    else setPassword(value)

    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setPageError((current) =>
      current?.fields.includes(field) ? null : current,
    )
  }

  return (
    <main className="min-h-screen bg-[var(--sm-canvas)] text-[var(--sm-ink)] lg:grid lg:grid-cols-[minmax(18rem,0.75fr)_minmax(28rem,1.25fr)]">
      <aside className="hidden border-r border-[var(--sm-border)] bg-[var(--sm-ink)] px-10 py-12 text-[var(--sm-on-brand)] lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-xl font-bold tracking-[-0.02em]"
        >
          SafeMove
        </Link>
        <div className="max-w-md">
          <LockKeyhole
            aria-hidden="true"
            className="mb-6 size-8 text-[var(--sm-brand-on-dark)]"
          />
          <p className="text-3xl font-semibold leading-tight tracking-[-0.03em]">
            Seu workspace e sua base privada, no mesmo lugar.
          </p>
          <p className="mt-5 leading-7 text-[var(--sm-inverse-muted)]">
            Acesse o ambiente correspondente à sua atuação profissional.
          </p>
        </div>
        <p className="text-sm text-[var(--sm-inverse-muted)]">
          Workspace profissional SafeMove
        </p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)] lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            SafeMove
          </Link>

          <div className="border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6 shadow-[var(--sm-shadow-elevated)] sm:p-8">
            <h1 className="text-3xl font-bold tracking-[-0.03em]">
              Entrar no SafeMove
            </h1>
            <p className="mt-3 leading-7 text-[var(--sm-muted)]">
              Use os dados da sua conta profissional.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleLogin} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => updateField("email", event.target.value)}
                  aria-invalid={fieldErrors.email ? "true" : undefined}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  className="h-11 bg-[var(--sm-surface)]"
                />
                {fieldErrors.email ? (
                  <p id="login-email-error" className="text-sm text-[var(--sm-danger)]">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => updateField("password", event.target.value)}
                  aria-invalid={fieldErrors.password ? "true" : undefined}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                  className="h-11 bg-[var(--sm-surface)]"
                />
                {fieldErrors.password ? (
                  <p id="login-password-error" className="text-sm text-[var(--sm-danger)]">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              {pageError ? (
                <p
                  role="alert"
                  aria-label={pageError.message}
                  className="border border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)] px-4 py-3 text-sm text-[var(--sm-danger)]"
                >
                  {pageError.message}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-[var(--sm-brand)] text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
              >
                {isLoading ? "Entrando…" : "Entrar"}
              </Button>
            </form>

            <p className="mt-7 text-sm text-[var(--sm-muted)]">
              Ainda não tem uma conta?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-[var(--sm-brand)] underline decoration-[var(--sm-border)] decoration-2 hover:text-[var(--sm-brand-hover)]"
              >
                Criar conta profissional
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
