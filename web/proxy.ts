import { NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const nonce = btoa(String.fromCharCode(...randomBytes))
  const isDevelopment = process.env.NODE_ENV === "development"
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // O eval é necessário apenas para debugging/HMR do Next em desenvolvimento.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    // Radix, gráficos e componentes existentes usam atributos style dinâmicos.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ")
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", policy)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", policy)
  return response
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js|map|woff2?|ttf|webmanifest)$).*)",
  ],
}
