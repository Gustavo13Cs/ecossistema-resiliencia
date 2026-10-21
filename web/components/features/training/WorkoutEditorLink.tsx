"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { hasNavigationApi, navigateToWorkoutPage } from "@/lib/workout-editor-navigation"

export function WorkoutEditorLink(props: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter()
  return <Link {...props} onNavigate={event => {
    props.onNavigate?.(event)
    if (!hasNavigationApi()) {
      event.preventDefault()
      navigateToWorkoutPage(router, props.href)
    }
  }} />
}
