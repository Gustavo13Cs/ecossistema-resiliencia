"use client"
import axios from "axios"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { collectPages, getArrayPage } from "@/lib/pagination"
import { queryKeys } from "@/lib/query-keys"
import {
  CLINICAL_MARKERS_DICTIONARY,
  evaluateMarkerValue,
  type ServerLabExam,
} from "@/types/lab-exam"
interface LabPoint {
  id: string
  clientId: string
  clientName: string
  date: string
  name: string
  value: number
  unit: string
}
export function useLabMarkerSeries(markerName: string, clientId?: string) {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: [
      ...queryKeys.centralLabExams(user?.sub ?? "anonymous"),
      "longitudinal",
      markerName,
      clientId ?? "ALL",
    ],
    enabled: Boolean(user?.sub && markerName),
    queryFn: async ({ signal }) => {
      try {
        return await collectPages<LabPoint>((page) =>
          getArrayPage<LabPoint>(
            "/lab-exams/longitudinal",
            { page, pageSize: 100, markerName, clientId },
            {},
            signal
          )
        )
      } catch (error) {
        if (
          !axios.isAxiosError<{ message?: unknown }>(error) ||
          error.response?.status !== 404 ||
          typeof error.response.data?.message !== "string" ||
          !error.response.data.message.startsWith(
            "Cannot GET /lab-exams/longitudinal"
          )
        )
          throw error
        // A rota de pontos só existe na API nova; a versão anterior usa o agregado.
        const response = await api.get<ServerLabExam[]>("/lab-exams", {
          signal,
        })
        if (!Array.isArray(response.data)) throw error
        return response.data
          .filter((exam) => !clientId || exam.clientId === clientId)
          .flatMap((exam) => {
            const marker = exam.markers.find(
              (value) => value.name.toLowerCase() === markerName.toLowerCase()
            )
            return marker
              ? [
                  {
                    ...marker,
                    id: exam.id,
                    clientId: exam.clientId,
                    clientName: exam.client.name,
                    date: exam.date,
                  },
                ]
              : []
          })
          .sort(
            (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
          )
      }
    },
  })
  const data = useMemo(
    () =>
      (query.data ?? []).map((point) => {
        const ref = CLINICAL_MARKERS_DICTIONARY[point.name],
          date = point.date.split("T")[0]
        return {
          ...point,
          date,
          displayDate: new Date(`${date}T12:00:00`).toLocaleDateString(
            "pt-BR",
            { day: "2-digit", month: "short", year: "2-digit" }
          ),
          status: evaluateMarkerValue(point.name, point.value),
          minRef: ref?.min,
          maxRef: ref?.max,
          optimalMin: ref?.optimalMin,
          optimalMax: ref?.optimalMax,
        }
      }),
    [query.data]
  )
  return { ...query, data }
}
