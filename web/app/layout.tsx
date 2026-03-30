import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth-context"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SafeMove B2B',
  description: 'Plataforma Corporativa de Resiliência',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-PT">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Analytics />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}