/** Observa retornos à página sem confundir o foco de controles com o da janela. */
export function subscribeToSessionResume(resume: () => void): () => void {
  let wasHidden = document.visibilityState === "hidden"
  let awaitingReturn = wasHidden || !document.hasFocus()
  let cacheRestorePending = false
  let cacheRestoreChecked = false

  const resumeAfterAbsence = () => {
    if (!awaitingReturn || document.visibilityState === "hidden") return
    // Consome o retorno antes da consulta: focus e visibilitychange podem vir separados.
    awaitingReturn = false
    if (cacheRestorePending) cacheRestoreChecked = true
    resume()
  }

  const onBlur = (event: FocusEvent) => {
    if (event.target === event.currentTarget) awaitingReturn = true
  }
  const onFocus = (event: FocusEvent) => {
    if (event.target === event.currentTarget) resumeAfterAbsence()
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      wasHidden = true
      awaitingReturn = true
    } else if (wasHidden) {
      wasHidden = false
      resumeAfterAbsence()
    }
  }
  const onPageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) return
    cacheRestorePending = true
    cacheRestoreChecked = false
    awaitingReturn = true
  }
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return
    // pageshow pode chegar antes ou depois dos eventos de foco/visibilidade do BFCache.
    if (!cacheRestorePending || !cacheRestoreChecked) {
      awaitingReturn = true
      resumeAfterAbsence()
    }
    cacheRestorePending = false
    cacheRestoreChecked = false
  }

  window.addEventListener("blur", onBlur)
  window.addEventListener("focus", onFocus)
  window.addEventListener("pagehide", onPageHide)
  window.addEventListener("pageshow", onPageShow)
  document.addEventListener("visibilitychange", onVisibilityChange)

  return () => {
    window.removeEventListener("blur", onBlur)
    window.removeEventListener("focus", onFocus)
    window.removeEventListener("pagehide", onPageHide)
    window.removeEventListener("pageshow", onPageShow)
    document.removeEventListener("visibilitychange", onVisibilityChange)
  }
}
