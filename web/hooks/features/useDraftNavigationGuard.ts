"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"

// API pública do navegador; os tipos locais mantêm compatibilidade com lib.dom antigas.
type TraverseEvent = Event & { navigationType: string; destination: { key: string; sameDocument: boolean } }
type BrowserNavigation = EventTarget & { traverseTo: (key: string) => unknown }

export function useDraftNavigationGuard(enabled: boolean, requestLeave: (proceed: () => void) => void) {
  const router = useRouter()
  const active = useRef(enabled)
  const request = useRef(requestLeave)
  const released = useRef(false)
  useLayoutEffect(() => { active.current = enabled && !released.current; request.current = requestLeave }, [enabled, requestLeave])
  const allowNavigation = useCallback((proceed: () => void) => {
    released.current = true
    active.current = false
    proceed()
  }, [])
  useEffect(() => {
    const navigation = (window as Window & { navigation?: BrowserNavigation }).navigation
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return
      if (!active.current && navigation) return
      event.preventDefault()
      const proceed = () => allowNavigation(() => navigateToWorkoutPage(router, `${url.pathname}${url.search}${url.hash}`))
      if (active.current) request.current(proceed)
      else proceed()
    }
    const navigate = (event: Event) => {
      const traversal = event as TraverseEvent
      if (traversal.navigationType !== "traverse" || !traversal.cancelable || !active.current) return
      traversal.preventDefault()
      request.current(() => allowNavigation(() => navigation?.traverseTo(traversal.destination.key)))
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!active.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    document.addEventListener("click", click, true)
    navigation?.addEventListener("navigate", navigate)
    window.addEventListener("beforeunload", beforeUnload)
    return () => {
      document.removeEventListener("click", click, true)
      navigation?.removeEventListener("navigate", navigate)
      window.removeEventListener("beforeunload", beforeUnload)
    }
  }, [router, allowNavigation])
  return allowNavigation
}
