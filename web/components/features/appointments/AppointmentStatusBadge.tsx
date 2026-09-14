import {
  Ban,
  CalendarClock,
  Check,
  CircleCheck,
  UserX,
  type LucideIcon,
} from "lucide-react"
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointment-display"
import { cn } from "@/lib/utils"
import type { AppointmentStatus } from "@/types/appointment"

const STATUS_STYLES: Record<
  AppointmentStatus,
  { icon: LucideIcon; className: string }
> = {
  SCHEDULED: {
    icon: CalendarClock,
    className: "bg-sky-50 text-sky-800",
  },
  CONFIRMED: {
    icon: Check,
    className: "bg-teal-50 text-teal-800",
  },
  COMPLETED: {
    icon: CircleCheck,
    className: "bg-emerald-50 text-emerald-800",
  },
  CANCELLED: {
    icon: Ban,
    className: "bg-rose-50 text-rose-800",
  },
  NO_SHOW: {
    icon: UserX,
    className: "bg-amber-50 text-amber-900",
  },
}

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus
  className?: string
}) {
  const style = STATUS_STYLES[status]
  const Icon = style.icon

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        style.className,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  )
}
