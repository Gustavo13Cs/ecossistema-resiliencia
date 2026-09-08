const ISOLATED_BROWSER_TEST_API_URL = "http://localhost:3000"

export function resolvePublicApiUrl(environment = process.env) {
  const apiUrl =
    environment.NEXT_PUBLIC_API_URL ||
    (environment.NODE_ENV === "test" || environment.GITHUB_ACTIONS === "true"
      ? ISOLATED_BROWSER_TEST_API_URL
      : undefined)

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required")
  }

  try {
    new URL(apiUrl)
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid absolute URL")
  }

  return apiUrl
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: resolvePublicApiUrl(),
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    const apiOrigin = new URL(resolvePublicApiUrl()).origin

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin}`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
