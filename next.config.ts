import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Gives `next dev` the same Cloudflare bindings (R2, D1, Images) the deployed Worker
// has, read from wrangler.jsonc, so getCloudflareContext() works locally. Dev only: the
// UPLOADS binding is remote, and a production build must not need a Cloudflare login.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

// A custom domain in front of the uploads bucket (e.g. https://files.example.com),
// if one has been set up instead of the default *.r2.dev address.
const uploadsHost = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;

const nextConfig: NextConfig = {
  experimental: {
    // Generated PDFs/Word files and gallery photos (10 MB max, see site-details) are
    // uploaded to server actions; Next's default cap is 1 MB.
    serverActions: { bodySizeLimit: "11mb" },
  },
  images: {
    // Admin-uploaded gallery photos live in R2 — next/image refuses to serve an
    // external domain that isn't allowlisted here. The Vercel Blob entry keeps photos
    // uploaded before the move to Cloudflare working until they are copied across.
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      ...(uploadsHost ? [{ protocol: "https" as const, hostname: uploadsHost }] : []),
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
