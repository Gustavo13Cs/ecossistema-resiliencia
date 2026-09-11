import Link from "next/link"
import { ClipboardList, Calculator, FlaskConical, Beaker } from "lucide-react"

interface NutritionistQuickActionsProps {
  clientId: string
}

export function NutritionistQuickActions({ clientId }: NutritionistQuickActionsProps) {
  const actions = [
    {
      label: "Nova Anamnese",
      href: `/clientes/${clientId}/nova-anamnese`,
      icon: ClipboardList,
      colors: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border-emerald-100",
    },
    {
      label: "Cálculo Energético",
      href: `/clientes/${clientId}/calculo-energetico`,
      icon: Calculator,
      colors: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-100",
    },
    {
      label: "Fórmulas / Suplementos",
      href: `/clientes/${clientId}/nova-suplementacao`,
      icon: Beaker,
      colors: "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border-amber-100",
    },
    {
      label: "Exames Lab.",
      href: `/clientes/${clientId}/exames`,
      icon: FlaskConical,
      colors: "bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-rose-100",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link key={action.label} href={action.href} className="block">
            <div
              className={`flex items-center gap-3 p-3.5 rounded-[var(--sm-radius-md)] border transition-all ${action.colors}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-bold text-sm leading-tight">{action.label}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
