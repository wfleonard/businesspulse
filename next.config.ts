import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for a small Docker runtime image.
  output: "standalone",
  // The /scan landing page is read from disk at request time (src/app/scan/route.ts).
  outputFileTracingIncludes: {
    "/scan": ["./src/app/scan/page.html"],
  },
};

export default nextConfig;
