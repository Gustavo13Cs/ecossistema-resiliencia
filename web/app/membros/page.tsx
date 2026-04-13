"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Eye, ArrowLeft, UserPlus, Apple } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

export default function MembrosPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users")
      setUsers(response.data)
    } catch (error) {
      console.error("Erro ao buscar membros", error)
    }
  }

  const isNutri = user?.businessContext === 'NUTRITIONIST'

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      {/* Container Fluido */}
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {isNutri ? 'Diretório de Pacientes' : 'Gestão de Membros'}
              </h1>
              <p className="text-slate-500 mt-1">
                {isNutri ? 'Gerencie fichas, dietas e acompanhamentos.' : 'Lista completa de todos os alunos registados.'}
              </p>
            </div>
          </div>

          <Link href="/membros/novo">
            <Button className={`h-12 px-6 shadow-md text-base ${isNutri ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <UserPlus className="w-5 h-5 mr-2" />
              {isNutri ? 'Cadastrar Novo Paciente' : 'Cadastrar Membro'}
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className={`bg-${isNutri ? 'teal' : 'blue'}-50 border-b border-${isNutri ? 'teal' : 'blue'}-100`}>
            <CardTitle className={`text-lg flex items-center gap-2 text-${isNutri ? 'teal' : 'blue'}-800`}>
              Lista de Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="py-4 px-6">Nome do Paciente</TableHead>
                    <TableHead className="px-6">E-mail / Contato</TableHead>
                    <TableHead className="px-6">Ingresso</TableHead>
                    <TableHead className="text-right px-6">Ações Rápidas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-semibold text-slate-700 py-4 px-6">{u.name}</TableCell>
                      <TableCell className="text-slate-500 px-6">
                        {u.email}
                        {u.phone && <span className="block text-xs text-slate-400 mt-1">{u.phone}</span>}
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium px-6">
                        {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                      </TableCell>
                      
                      <TableCell className="text-right space-x-2 px-6">
                       {isNutri && (
                          <Link href={`/membros/${u.id}/nova-dieta`}>
                            <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" title="Montar Cardápio">
                              <Apple className="w-4 h-4 mr-1" /> Dieta
                            </Button>
                          </Link>
                        )}
                        <Link href={`/membros/${u.id}`}>
                          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Eye className="w-4 h-4 mr-1" /> Ficha Completa
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                        Nenhum perfil registado. Clique em "Cadastrar Novo Paciente" no topo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}