"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AsyncState } from "@/components/feedback/AsyncState"
import { canUseEditorDocument, hasNavigationApi, navigateToWorkoutPage } from "@/lib/workout-editor-navigation"

export function WorkoutDocumentBoundary({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (hasNavigationApi()) { setReady(true); return }
    const initial = performance.getEntriesByType("navigation")[0]?.name
    if (!canUseEditorDocument(initial, window.location.href)) {
      // Nunca monta um formulário editável em uma entrada SPA no fallback.
      if (initial) navigateToWorkoutPage(router, window.location.href, "replace")
      return
    }
    setReady(true)
    // Mesmo os links do seletor/estado terminal saem deste documento por completo.
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return
      const url = new URL(anchor.href)
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return
      event.preventDefault()
      navigateToWorkoutPage(router, url.href)
    }
    document.addEventListener("click", click, true)
    return () => document.removeEventListener("click", click, true)
  }, [router])
  if (!ready) return <AsyncState kind="loading" title="Preparando editor seguro" description="Abrindo uma página que preserve suas alterações ao navegar." />
  return children
}
