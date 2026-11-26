// O sinal compartilhado contém apenas a transição e um identificador descartável.
const key = "safemove.session-change"
type Transition = "pending" | "signed-out" | "signed-in"
type SessionEvent = { transition: Transition; id: string }

function parse(value: unknown): SessionEvent | null {
  if (typeof value !== "string") return null
  const [transition, id] = value.split(":")
  if (!id || !["pending", "signed-out", "signed-in"].includes(transition)) return null
  return { transition: transition as Transition, id }
}

export function readSessionEvent(): SessionEvent | null {
  try {
    return parse(window.localStorage.getItem(key))
  } catch {
    return null
  }
}

export function sessionEvents(receive: (event: SessionEvent) => void) {
  let channel: BroadcastChannel | undefined
  try {
    if (typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(key)
  } catch { /* O evento de storage continua disponível. */ }

  let lastId: string | undefined
  const notify = (value: unknown) => {
    const event = parse(value)
    if (!event || event.id === lastId) return
    const latest = readSessionEvent()
    if (latest && latest.id !== event.id) return
    lastId = event.id
    receive(event)
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) notify(event.newValue)
  }
  window.addEventListener("storage", onStorage)
  if (channel) channel.onmessage = event => notify(event.data)

  return {
    publish(transition: Transition) {
      const id = crypto.getRandomValues(new Uint32Array(4)).join("-")
      const value = transition + ":" + id
      lastId = id
      try { window.localStorage.setItem(key, value) } catch { /* Usar o canal. */ }
      channel?.postMessage(value)
    },
    close() {
      window.removeEventListener("storage", onStorage)
      channel?.close()
    },
  }
}
