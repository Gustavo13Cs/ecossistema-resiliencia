import { EXERCISE_MEDIA_RULES } from "./exercise-media-rules"
export { EXERCISE_MEDIA_RULES } from "./exercise-media-rules"

export interface MediaOriginRule { readonly origin: string; readonly pathPrefix: string }

export function buildExerciseMediaDirectives(rules: readonly MediaOriginRule[]): { imgSrc: string[]; mediaSrc: string[] } {
  const sources = [...new Set(rules.map(rule => {
    const url = new URL(rule.origin)
    if (url.protocol !== "https:" || url.origin !== rule.origin || /[\s*;?#]/.test(rule.pathPrefix) || !rule.pathPrefix.startsWith("/") || !rule.pathPrefix.endsWith("/")) throw new Error("Invalid media origin rule")
    return `${rule.origin}${rule.pathPrefix}`
  }))]
  return { imgSrc: sources, mediaSrc: [...sources] }
}

export function isExerciseMediaUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return !url.username && !url.password && !url.search && !url.hash && url.protocol === "https:" && EXERCISE_MEDIA_RULES.some(rule => url.origin === rule.origin && url.pathname.startsWith(rule.pathPrefix))
  } catch { return false }
}

// Presentation accepts only the server's canonical individual-video URL, never embeds.
export function safePersonalVideoUrl(value?: string): string | null {
  if (!value || value.length > 2048) return null
  if (/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(value) || /^https:\/\/vimeo\.com\/[1-9][0-9]*$/.test(value)) return value
  return null
}

export function safeCreditUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}
