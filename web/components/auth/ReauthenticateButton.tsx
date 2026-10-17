"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

export function ReauthenticateButton() {
  const { logout } = useAuth()
  const [pending, setPending] = useState(false)

  return (
    <Button
      type="button"
      className="min-h-11"
      disabled={pending}
      onClick={() => {
        setPending(true)
        // O logout limpa sessão/cache e navega para /auth/login no finally.
        void logout().catch(() => {}).finally(() => setPending(false))
      }}
    >
      {pending ? "Encerrando sessão..." : "Entrar novamente"}
    </Button>
  )
}
