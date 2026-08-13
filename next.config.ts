import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "exceljs"],
  experimental: {
    serverActions: {
      // Vercel caps a serverless request body at 4.5 MB. Asking for more here
      // does not raise that ceiling — it just moves where the upload fails,
      // from a handled error to an opaque one.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
