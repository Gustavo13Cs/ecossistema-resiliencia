import './globals.css'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { AuthProvider } from '@/contexts/auth-context'
import { DirectionContract } from '@/components/design/DirectionContract'
import { LayoutWrapper } from '@/components/LayoutWrapper'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-safemove',
})

export const metadata = {
  title: 'SafeMove | Workspace profissional',
  description: 'Gestão privada de clientes para profissionais de saúde e movimento.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // headers() exige renderização por requisição para o nonce dos scripts do Next.
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="pt-BR" nonce={nonce}>
      <body className={`${inter.variable} font-sans`}>
        <DirectionContract />
        <QueryProvider>
          <AuthProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
