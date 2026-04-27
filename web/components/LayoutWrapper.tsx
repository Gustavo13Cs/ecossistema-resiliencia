"use client"

import { useAuth } from "@/contexts/auth-context"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <main className={`flex-1 flex flex-col w-full min-h-screen transition-all duration-300 ${user ? 'md:ml-64' : ''}`}>
      {children}
    </main>
  )
}