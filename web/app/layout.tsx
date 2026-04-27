import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth-context'
import { Sidebar } from '@/components/Sidebar'
import { LayoutWrapper } from '@/components/LayoutWrapper' 
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SafeMove - Plataforma Multidisciplinar',
  description: 'Gestão integrada para Nutricionistas, Personais e Fisioterapeutas.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            
          </div>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}