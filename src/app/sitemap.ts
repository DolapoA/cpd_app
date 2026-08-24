import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cpdregister.app";

/**
 * Only the pages that are meant to be found. Everything else is behind a
 * login or reachable only by holding a code, and listing those would be
 * handing a crawler a map of other people's attendance records.
 *
 * The dates are written down rather than computed.
 *
 * They used to be `new Date()`, which meant every URL claimed to have changed
 * at the moment the sitemap was fetched — a different answer every time, and
 * the same answer for a guide written in August as for one edited this
 * morning. Google's own guidance is that it ignores lastmod when it proves
 * unreliable, and for a page it has discovered but never crawled the sitemap
 * is the only signal there is. A date that means nothing is worse than no
 * date at all.
 *
 * So: when you change what a page says, change its date here. That is the
 * whole maintenance burden, and it is the point — a lastmod nobody has to
 * maintain is a lastmod nobody can trust.
 */
const UPDATED = {
  home: "2026-08-24",
  cpdIndex: "2026-08-24",
  guides: "2026-08-24",
  faq: "2026-08-19",
  privacy: "2026-08-15",
  terms: "2026-08-16",
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, lastModified: UPDATED.home, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/cpd`, lastModified: UPDATED.cpdIndex, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((guide) => ({
      url: `${SITE}/cpd/${guide.slug}`,
      lastModified: UPDATED.guides,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE}/faq`, lastModified: UPDATED.faq, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/privacy`, lastModified: UPDATED.privacy, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: UPDATED.terms, changeFrequency: "yearly", priority: 0.3 },
  ];
}
