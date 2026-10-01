interface PrintDocumentInput {
  title: unknown
  // Apenas CSS estático e fragmentos HTML escapados pelos builders deste módulo.
  css: string
  body: string
}

export function escapeHtml(value: unknown): string {
  const text = value == null ? "" : String(value)
  return text.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!)
}

export function multiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>")
}

export function buildPrintDocument({ title, css, body }: PrintDocumentInput): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`
}

export function openPrintWindow(html: string, features?: string): Window | null {
  const popup = window.open("", "_blank", features)
  if (!popup) return null
  popup.opener = null
  popup.document.open()
  popup.addEventListener("load", () => {
    if (popup.closed) return
    popup.focus()
    popup.print()
  }, { once: true })
  popup.document.write(html)
  popup.document.close()
  return popup
}
