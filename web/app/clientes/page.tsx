"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useClients } from "@/hooks/features/useClients"

export default function ClientesPage() {
  const { data: clients = [], error, isPending } = useClients("ACTIVE")

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 md:px-12 lg:px-20">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Clientes</h1>
            <p className="mt-1 text-slate-500">Gerencie os prontuários privados dos seus clientes.</p>
          </div>
          <Button asChild>
            <Link href="/clientes/novo">Novo cliente</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Clientes ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? <p role="status">Carregando clientes...</p> : null}
            {error ? <p role="alert">Não foi possível carregar os clientes. Tente novamente.</p> : null}
            {!isPending && !error && clients.length === 0 ? (
              <p role="status">Nenhum cliente ativo</p>
            ) : null}
            {!isPending && !error && clients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-600">
                    <tr>
                      <th scope="col" className="px-3 py-3">Nome</th>
                      <th scope="col" className="px-3 py-3">E-mail</th>
                      <th scope="col" className="px-3 py-3">Telefone</th>
                      <th scope="col" className="px-3 py-3">Objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b last:border-0">
                        <td className="px-3 py-4 font-medium text-slate-800">{client.name}</td>
                        <td className="px-3 py-4 text-slate-600">{client.email ?? "-"}</td>
                        <td className="px-3 py-4 text-slate-600">{client.phone ?? "-"}</td>
                        <td className="px-3 py-4 text-slate-600">{client.goal ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
