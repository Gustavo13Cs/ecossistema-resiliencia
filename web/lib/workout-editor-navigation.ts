type RouterNavigation = { push: (url: string) => void; replace: (url: string) => void }

export function hasNavigationApi() {
  return typeof window !== "undefined" && Boolean((window as Window & { navigation?: unknown }).navigation)
}

export function navigateToWorkoutPage(router: RouterNavigation, url: string, mode: "push" | "replace" = "push") {
  if (hasNavigationApi()) router[mode](url)
  else if (mode === "replace") window.location.replace(url)
  else window.location.assign(url)
}

// PerformanceNavigationTiming descreve o documento, não a URL alterada pelo App Router.
export function canUseEditorDocument(initialUrl: string | undefined, currentUrl: string) {
  if (!initialUrl) return false
  const initial = new URL(initialUrl), current = new URL(currentUrl)
  return initial.origin === current.origin && initial.pathname === current.pathname && initial.search === current.search
}
