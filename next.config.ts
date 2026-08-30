import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Admin-uploaded gallery photos live in Vercel Blob once uploaded — next/image
    // refuses to serve an external domain that isn't allowlisted here.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
