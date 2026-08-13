import type { MetadataRoute } from "next";

/**
 * Attendance slips, verification pages and registers are reachable by anyone
 * holding the code, but they are not for indexing: a search engine crawling
 * them would put attendee names into public results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/r/", "/slip/", "/verify/", "/record/", "/registers/", "/account", "/profile", "/dashboard"],
      },
    ],
  };
}
