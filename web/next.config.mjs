/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL

    if (!configuredApiUrl && process.env.NODE_ENV !== "test") {
      throw new Error("NEXT_PUBLIC_API_URL is required")
    }

    let apiOrigin

    try {
      apiOrigin = new URL(configuredApiUrl ?? "http://localhost:3000").origin
    } catch {
      throw new Error("NEXT_PUBLIC_API_URL must be a valid absolute URL")
    }

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
