import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static site: everything runs in the browser, no server.
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
