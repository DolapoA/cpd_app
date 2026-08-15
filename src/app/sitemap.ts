import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cpdregister.app";

/**
 * Only the pages that are meant to be found. Everything else is behind a
 * login or reachable only by holding a code, and listing those would be
 * handing a crawler a map of other people's attendance records.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/plans`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
