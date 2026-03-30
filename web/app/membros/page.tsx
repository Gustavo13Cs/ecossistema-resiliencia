// web/app/membros/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Users, UserPlus, BadgeCheck, Eye } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ResilienceChart } from "@/components/resilience-chart"

export default function MembrosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<any[]>([])


  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userWorkouts, setUserWorkouts] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    phone: "",
    birthDate: "",
    department: "",
    goal: "",
  })

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users")
      setUsuarios(response.data)
    } catch (error) {
      console.error("Erro ao buscar utilizadores", error)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined
      }

      await api.post("/users", payload)
      toast.success("Membro cadastrado com sucesso!")
      
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", phone: "", birthDate: "", department: "", goal: "" })
      fetchUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao cadastrar membro.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewUser = async (user: any) => {
    setSelectedUser(user)
    setIsModalOpen(true) 
    
    try {
      const response = await api.get(`/users/${user.id}/workouts`)
      setUserWorkouts(response.data)
    } catch (error) {
      toast.error("Erro ao carregar o histórico deste membro.")
      setUserWorkouts([])
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Administrador</span>
      case 'HR_MANAGER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Gestor</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Membro</span>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 pb-12">
      <header className="bg-white/80 backdrop-blur border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/home">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Gestão de Membros
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Card className="border-0 bg-white/90 backdrop-blur shadow-lg sticky top-28">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-slate-800">Novo Membro</CardTitle>
                <CardDescription>Adicione colaboradores à plataforma.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" required placeholder="Ex: João da Silva" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail de Acesso</Label>
                    <Input id="email" type="email" required placeholder="joao@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha Inicial</Label>
                    <Input id="password" type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de Perfil</Label>
                    <select id="role" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                      <option value="EMPLOYEE">Membro / Aluno / Cliente</option>
                      <option value="HR_MANAGER">Gestor / Profissional</option>
                      <option value="ADMIN">Administrador (Dono)</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 border-t pt-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp / Telefone</Label>
                      <Input id="phone" placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Data de Nascimento</Label>
                      <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}/>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Departamento (RH)</Label>
                      <Input id="department" placeholder="Ex: Vendas, TI" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal">Objetivo (Treino/Saúde)</Label>
                      <Input id="goal" placeholder="Ex: Emagrecimento, Postura" value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })}/>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:from-blue-700 hover:to-teal-600 shadow-md h-11 text-base mt-4">
                    {loading ? "Cadastrando..." : "Cadastrar Membro"}
                  </Button>
                  
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            <Card className="border-0 bg-white/90 backdrop-blur shadow-lg h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-6 h-6 text-teal-600" />
                  <CardTitle className="text-xl text-slate-800">Membros Registados</CardTitle>
                </div>
                <CardDescription>Lista completa de todos os utilizadores com acesso ao sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                {usuarios.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Nenhum membro encontrado.</p>
                ) : (
                  <div className="rounded-md border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold text-slate-700">Nome</TableHead>
                          <TableHead className="font-semibold text-slate-700">E-mail</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-center">Perfil</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuarios.map((user) => (
                          <TableRow key={user.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-800">{user.name}</TableCell>
                            <TableCell className="text-slate-600">{user.email}</TableCell>
                            <TableCell className="text-center">{getRoleBadge(user.role)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleViewUser(user)} title="Ver Histórico">
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-800">
              Raio-X: {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Acompanhamento detalhado de saúde e treinos do colaborador.
            </DialogDescription>
          </DialogHeader>

          {userWorkouts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-100 mt-4">
              <p className="text-slate-500">Este membro ainda não registou nenhuma atividade.</p>
            </div>
          ) : (
            <div className="space-y-8 mt-4">
              <ResilienceChart workouts={userWorkouts} />

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Intensidade</TableHead>
                      <TableHead className="text-right">Sono / Humor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userWorkouts.map((workout) => (
                      <TableRow key={workout.id}>
                        <TableCell className="font-medium text-slate-700">
                          {new Date(workout.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-700">{workout.activityType}</TableCell>
                        <TableCell>{workout.durationMinutes} min</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border
                            ${workout.intensity === 'LEVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              workout.intensity === 'MODERADO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {workout.intensity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {workout.sleepHours ? `${workout.sleepHours}h` : '-'} / {workout.moodLevel ? `Nível ${workout.moodLevel}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}