import { useId } from "react"
import Image from "next/image"
import { ShieldCheck, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import styles from "./SessionScreen.module.css"

interface SessionScreenProps {
  title: string
  description: string
  isOffline?: boolean
  onRetry?: () => void
}

export function SessionScreen({ title, description, isOffline = false, onRetry }: SessionScreenProps) {
  const titleId = useId()
  const descriptionId = useId()
  const Icon = isOffline ? WifiOff : ShieldCheck

  return (
    <div className={styles.screen}>
      <div className={styles.brand}>
        <Image src="/logo.png" alt="" width={32} height={32} sizes="32px" priority />
        <span>SafeMove</span>
      </div>

      <section
        role={isOffline ? "alert" : "status"}
        aria-live={isOffline ? "assertive" : "polite"}
        aria-busy={!isOffline}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.content}
      >
        <div className={styles.indicator} data-offline={isOffline} aria-hidden="true">
          {!isOffline && <span className={styles.ring} />}
          <span className={styles.icon}>
            <Icon size={30} strokeWidth={1.5} />
          </span>
        </div>
        <p className={styles.eyebrow}>Área profissional</p>
        <h2 id={titleId} className={styles.title}>{title}</h2>
        <p id={descriptionId} className={styles.description}>{description}</p>
        {isOffline && onRetry && (
          <Button type="button" onClick={onRetry} className="mt-7 min-h-11 px-5">
            Tentar novamente
          </Button>
        )}
      </section>
    </div>
  )
}
