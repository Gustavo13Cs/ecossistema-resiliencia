const ISOLATED_BROWSER_TEST_API_URL = "http://localhost:3000"
const PUBLIC_API_PATH = "/api"

export function resolvePublicApiUrl(environment = process.env) {
  const apiUrl =
    environment.INTERNAL_API_URL ||
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
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: PUBLIC_API_PATH,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
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
  async rewrites() {
    const apiTarget = resolvePublicApiUrl().replace(/\/$/, "")

    return [
      {
        source: `${PUBLIC_API_PATH}/:path*`,
        destination: `${apiTarget}/:path*`,
      },
    ]
  },
}

export default nextConfig
