import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cpdregister.app";

/**
 * Attendance slips, verification pages and registers are reachable by anyone
 * holding the code, but they are not for indexing: a crawler that found one
 * would put an attendee's name into public search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: [
          "/r/",
          "/slip/",
          "/verify/",
          "/verify-email/",
          "/reset",
          "/record",
          "/registers",
          "/account",
          "/profile",
          "/dashboard",
          "/login",
          "/signup",
          "/feedback",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
