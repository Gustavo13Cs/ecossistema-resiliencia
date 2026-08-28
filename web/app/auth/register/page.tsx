"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import type { ProfessionalRole } from "@/types/auth"

const PROFESSIONAL_ROLES: ReadonlyArray<{
  id: ProfessionalRole
  label: string
  description: string
}> = [
  {
    id: "NUTRITIONIST",
    label: "Nutricionista",
    description: "Atendimento e acompanhamento nutricional.",
  },
  {
    id: "PERSONAL",
    label: "Personal Trainer",
    description: "Treinamento e acompanhamento de clientes.",
  },
  {
    id: "PHYSIO",
    label: "Fisioterapeuta",
    description: "Cuidado e acompanhamento fisioterapêutico.",
  },
]

const PASSWORD_RULES = [
  { label: "Mínimo de 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Uma letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Uma letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Um número", test: (value: string) => /\d/.test(value) },
] as const

type RegisterFieldErrors = {
  name?: string
  email?: string
  password?: string
}

function toRegisterMessage(error: unknown) {
  if (!axios.isAxiosError(error) || !error.response) {
    return "Não foi possível acessar o SafeMove agora. Tente novamente."
  }

  if (error.response.status === 429) {
    return "Muitas tentativas. Aguarde um momento e tente novamente."
  }

  if (error.response.status >= 500) {
    return "O SafeMove está indisponível no momento. Tente novamente."
  }

  const message = error.response.data as { message?: unknown } | undefined
  return typeof message?.message === "string"
    ? message.message
    : "Não foi possível criar a conta. Revise os dados e tente novamente."
}

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [formData, setFormData] = useState({
    role: "NUTRITIONIST" as ProfessionalRole,
    name: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
  })

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: RegisterFieldErrors = {}

    if (!formData.name.trim()) nextErrors.name = "Informe seu nome completo."
    if (!formData.email.trim()) nextErrors.email = "Informe seu e-mail."
    if (!PASSWORD_RULES.every((rule) => rule.test(formData.password))) {
      nextErrors.password = "A senha precisa atender a todos os requisitos."
    }

    setFieldErrors(nextErrors)
    setPageError(null)
    if (Object.keys(nextErrors).length > 0) return

    setIsLoading(true)
    try {
      await api.post("/auth/register", {
        role: formData.role,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        companyName: formData.companyName.trim(),
        password: formData.password,
      })
      toast.success("Conta profissional criada. Entre para continuar.")
      router.push("/auth/login")
    } catch (error: unknown) {
      setPageError(toRegisterMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--sm-canvas)] px-4 py-8 text-[var(--sm-ink)] sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          SafeMove
        </Link>

        <div className="mt-6 border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6 shadow-[var(--sm-shadow-elevated)] sm:p-8 lg:p-10">
          <header className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Criar conta profissional
            </h1>
            <p className="mt-3 leading-7 text-[var(--sm-muted)]">
              Escolha uma atuação e informe os dados usados no seu workspace.
            </p>
          </header>

          <form className="mt-9 space-y-9" onSubmit={handleRegister} noValidate>
            <fieldset
              role="radiogroup"
              aria-labelledby="professional-role-legend"
              className="m-0 min-w-0 border-0 p-0"
            >
              <legend
                id="professional-role-legend"
                className="text-base font-semibold"
              >
                Escolha sua atuação profissional
              </legend>
              <p className="mt-2 text-sm leading-6 text-[var(--sm-muted)]">
                Sua conta terá uma única atuação.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {PROFESSIONAL_ROLES.map((role) => {
                  const isSelected = formData.role === role.id
                  return (
                    <label
                      key={role.id}
                      className={`flex min-h-32 cursor-pointer flex-col justify-between rounded-[var(--sm-radius-md)] border p-4 transition-colors ${
                        isSelected
                          ? "border-[var(--sm-brand)] bg-[var(--sm-brand-subtle)]"
                          : "border-[var(--sm-border)] bg-[var(--sm-surface)] hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.id}
                        aria-label={role.label}
                        checked={isSelected}
                        onChange={() =>
                          setFormData((current) => ({ ...current, role: role.id }))
                        }
                        className="size-4 accent-[var(--sm-brand)]"
                      />
                      <span className="mt-5 font-semibold">{role.label}</span>
                      <span className="mt-1 text-sm leading-5 text-[var(--sm-muted)]">
                        {role.description}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="border-t border-[var(--sm-border)] pt-8">
              <h2 className="text-lg font-semibold">Seus dados profissionais</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    aria-invalid={fieldErrors.name ? "true" : undefined}
                    aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
                    className="h-11 bg-[var(--sm-surface)]"
                  />
                  {fieldErrors.name ? (
                    <p id="register-name-error" className="text-sm text-[var(--sm-danger)]">
                      {fieldErrors.name}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    aria-invalid={fieldErrors.email ? "true" : undefined}
                    aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                    className="h-11 bg-[var(--sm-surface)]"
                  />
                  {fieldErrors.email ? (
                    <p id="register-email-error" className="text-sm text-[var(--sm-danger)]">
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="h-11 bg-[var(--sm-surface)]"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="companyName">Local de atendimento (opcional)</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }))
                    }
                    className="h-11 bg-[var(--sm-surface)]"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    aria-invalid={fieldErrors.password ? "true" : undefined}
                    aria-describedby={`password-requirements${
                      fieldErrors.password ? " register-password-error" : ""
                    }`}
                    className="h-11 bg-[var(--sm-surface)]"
                  />
                  <ul
                    id="password-requirements"
                    className="grid gap-x-6 gap-y-1 text-sm text-[var(--sm-muted)] sm:grid-cols-2"
                  >
                    {PASSWORD_RULES.map((rule) => (
                      <li key={rule.label}>{rule.label}</li>
                    ))}
                  </ul>
                  {fieldErrors.password ? (
                    <p
                      id="register-password-error"
                      className="text-sm text-[var(--sm-danger)]"
                    >
                      {fieldErrors.password}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {pageError ? (
              <p
                role="alert"
                aria-label={pageError}
                className="border border-red-200 bg-[var(--sm-danger-subtle)] px-4 py-3 text-sm text-[var(--sm-danger)]"
              >
                {pageError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-[var(--sm-border)] pt-7 sm:flex-row sm:items-center">
              <p className="text-sm text-[var(--sm-muted)]">
                Já possui uma conta?{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-[var(--sm-brand)] underline decoration-[var(--sm-border)] decoration-2 hover:text-[var(--sm-brand-hover)]"
                >
                  Entrar
                </Link>
              </p>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 bg-[var(--sm-brand)] px-6 text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]"
              >
                {isLoading ? "Criando conta…" : "Criar conta"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
