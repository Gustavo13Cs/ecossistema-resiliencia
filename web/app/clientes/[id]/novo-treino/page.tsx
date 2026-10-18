"use client"

import { useParams } from "next/navigation"
import { WorkoutDraftWorkspace } from "@/components/features/training/WorkoutDraftWorkspace"

export default function NovoTreinoPage() {
  const { id } = useParams<{ id: string }>()
  return <WorkoutDraftWorkspace clientId={id} />
}
