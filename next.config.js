/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Don't let browsers/proxies serve a stale app shell after a deploy.
        // Excludes _next (hashed assets are safe to cache) and api routes.
        source: "/:path((?!_next|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
