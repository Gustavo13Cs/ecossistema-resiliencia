"use client"

import { useParams } from "next/navigation"
import { WorkoutDraftWorkspace } from "@/components/features/training/WorkoutDraftWorkspace"

export default function DraftPage() {
  const { id, draftId } = useParams<{ id: string; draftId: string }>()
  return <WorkoutDraftWorkspace clientId={id} draftId={draftId} />
}
