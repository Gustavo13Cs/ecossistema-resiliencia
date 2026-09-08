import { useId, type ReactNode } from "react"
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react"

interface AsyncStateProps {
  kind: "loading" | "empty" | "error"
  title: string
  description: string
  action?: ReactNode
}

const STATE_ICONS = {
  loading: LoaderCircle,
  empty: Inbox,
  error: AlertCircle,
} as const

export function AsyncState({ kind, title, description, action }: AsyncStateProps) {
  const titleId = useId()
  const descriptionId = useId()
  const Icon = STATE_ICONS[kind]
  const isError = kind === "error"

  return (
    <section
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={kind === "loading"}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="flex min-h-56 flex-col items-center justify-center rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-6 py-10 text-center shadow-[var(--sm-shadow-rest)]"
    >
      <Icon
        aria-hidden="true"
        className={`size-7 ${
          isError ? "text-[var(--sm-danger)]" : "text-[var(--sm-brand)]"
        } ${kind === "loading" ? "animate-spin" : ""}`}
        strokeWidth={1.8}
      />
      <h2 id={titleId} className="mt-4 text-lg font-bold text-[var(--sm-ink)]">
        {title}
      </h2>
      <p id={descriptionId} className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  )
}
