import axios from "axios"
import { api } from "./api"

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  pageCount: number
}
export interface PageResult<T> {
  items: T[]
  pagination: PaginationMeta
  legacyItems?: T[]
}
export interface PageRequest {
  page: number
  pageSize: number
}
export function paginationMeta(
  total: number,
  { page, pageSize }: PageRequest
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}
export function legacyPage<T>(items: T[], request: PageRequest): PageResult<T> {
  return {
    items: items.slice(
      (request.page - 1) * request.pageSize,
      request.page * request.pageSize
    ),
    pagination: paginationMeta(items.length, request),
    legacyItems: items,
  }
}
function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      signal?.removeEventListener("abort", abort)
      reject(new axios.CanceledError("Leitura cancelada"))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort)
      resolve()
    }, delay)
    signal?.addEventListener("abort", abort, { once: true })
    if (signal?.aborted) abort()
  })
}
async function getBoundedArray<T>(
  path: string,
  params: object,
  signal?: AbortSignal
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await api.get<T[]>(path, { params, signal })
    } catch (error) {
      if (
        !axios.isAxiosError(error) ||
        error.response?.status !== 429 ||
        attempt >= 3
      )
        throw error
      const header = Object.entries(error.response.headers).find(
        ([key]) => key.toLowerCase() === "retry-after"
      )?.[1]
      const raw =
        typeof header === "string" || typeof header === "number"
          ? String(header)
          : ""
      const seconds = raw.trim() ? Number(raw) : NaN
      const date = Date.parse(raw)
      const delay = Number.isFinite(seconds)
        ? Math.max(0, seconds * 1000)
        : Number.isFinite(date)
          ? Math.max(0, date - Date.now())
          : 60000
      // Retoma somente este lote, respeitando o limite do servidor e o cancelamento.
      await waitForRetry(delay, signal)
    }
  }
}
const legacyArrayPaths = new Set<string>()

export function resetLegacyPaginationCache(): void {
  legacyArrayPaths.clear()
}

function readPaginationTotalHeader(headers: object) {
  return Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "x-pagination-total"
  )?.[1]
}

export async function getArrayPage<T>(
  path: string,
  params: PageRequest & Record<string, string | number | undefined>,
  legacyParams: Record<string, string> = {},
  signal?: AbortSignal
): Promise<PageResult<T>> {
  let response
  if (legacyArrayPaths.has(path)) {
    const legacyResponse = await getBoundedArray<T>(path, legacyParams, signal)
    if (!Array.isArray(legacyResponse.data))
      throw new Error("Resposta de listagem inválida")
    const legacyTotalHeader = readPaginationTotalHeader(legacyResponse.headers)
    if (legacyTotalHeader === undefined || legacyTotalHeader === null)
      return legacyPage(legacyResponse.data, params)
    // A API foi atualizada durante a sessão e já suporta paginação no servidor.
    legacyArrayPaths.delete(path)
    response = await getBoundedArray<T>(path, params, signal)
  } else {
    try {
      response = await getBoundedArray<T>(path, params, signal)
    } catch (error) {
      // Compatibilidade durante publicação: a API anterior rejeita propriedades novas.
      const messages: unknown = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null
      const unsupported =
        axios.isAxiosError(error) &&
        error.response?.status === 400 &&
        Array.isArray(messages) &&
        messages.length > 0 &&
        messages.every(
          (message) =>
            typeof message === "string" &&
            /^property (page|pageSize|q) should not exist$/.test(message)
        )
      if (!unsupported) throw error
      legacyArrayPaths.add(path)
      response = await getBoundedArray<T>(path, legacyParams, signal)
    }
  }
  if (!Array.isArray(response.data))
    throw new Error("Resposta de listagem inválida")
  const rawTotal = readPaginationTotalHeader(response.headers)
  if (rawTotal === undefined || rawTotal === null)
    return legacyPage(response.data, params)
  const total = Number(rawTotal)
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    response.data.length > params.pageSize
  )
    throw new Error("Metadados de paginação inválidos")
  return { items: response.data, pagination: paginationMeta(total, params) }
}
// Coleções completas são restritas a seletores e séries; falhas nunca viram totais parciais.
export async function collectPages<T>(
  fetchPage: (page: number) => Promise<PageResult<T>>
): Promise<T[]> {
  const first = await fetchPage(1)
  if (first.legacyItems) return first.legacyItems
  const items = [...first.items]
  for (let page = 2; page <= first.pagination.pageCount; page += 4) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(4, first.pagination.pageCount - page + 1) },
        (_, index) => fetchPage(page + index)
      )
    )
    batch.forEach((result) => {
      if (result.pagination.total !== first.pagination.total)
        throw new Error(
          "A lista mudou durante a leitura. Recarregue para tentar novamente."
        )
      items.push(...result.items)
    })
  }
  if (items.length !== first.pagination.total)
    throw new Error("Coleção incompleta. Recarregue para tentar novamente.")
  return items
}
