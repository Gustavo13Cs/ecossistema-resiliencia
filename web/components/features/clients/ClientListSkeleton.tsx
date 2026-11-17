import { useId } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface ClientListSkeletonProps {
  title: string
  description: string
}

const rows = [0, 1, 2, 3, 4]
const columnWidths = ["w-24", "w-full", "w-3/4", "w-20", "w-20"]

export function ClientListSkeleton({ title, description }: ClientListSkeletonProps) {
  const descriptionId = useId()

  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={title} aria-describedby={descriptionId}>
      <p id={descriptionId} className="sr-only">{description}</p>
      <div aria-hidden="true" className="divide-y divide-[var(--sm-border)] md:hidden">
        {rows.map(row => (
          <div key={row} className="flex items-start gap-3 p-4">
            <Skeleton className="size-10 shrink-0 rounded-full motion-reduce:animate-none" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-3/5 motion-reduce:animate-none" />
                <Skeleton className="h-7 w-16 shrink-0 rounded-full motion-reduce:animate-none" />
              </div>
              <Skeleton className="mt-1 h-5 w-4/5 motion-reduce:animate-none" />
              <Skeleton className="mt-3 h-5 w-full motion-reduce:animate-none" />
              <Skeleton className="mt-2 h-4 w-3/4 motion-reduce:animate-none" />
              <div className="mt-3 flex justify-end">
                <Skeleton className="h-11 w-24 motion-reduce:animate-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="hidden md:block">
        <div className="grid grid-cols-[20%_24%_24%_17%_15%] border-b border-[var(--sm-border)] bg-[var(--sm-canvas)]">
          {columnWidths.map((width, column) => (
            <div key={column} className="min-w-0 px-5 py-3">
              <Skeleton className={`h-4 max-w-full motion-reduce:animate-none ${width} ${column === 4 ? "ml-auto" : ""}`} />
            </div>
          ))}
        </div>
        {rows.map(row => (
          <div key={row} className="grid grid-cols-[20%_24%_24%_17%_15%] items-center border-b border-[var(--sm-border)] last:border-0">
            {columnWidths.map((width, column) => (
              <div key={column} className="min-w-0 px-5 py-4">
                <Skeleton className={`max-w-full motion-reduce:animate-none ${width} ${column === 4 ? "ml-auto h-11" : "h-5"}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
