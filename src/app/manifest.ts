import type { MetadataRoute } from "next";

/**
 * What a phone needs to install this as an app.
 *
 * `start_url` is the dashboard rather than the landing page: someone who has
 * put it on their home screen has an account, and would be sent to a marketing
 * page every time otherwise. Signed-out visitors are redirected to /login from
 * there anyway.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CPD Register",
    short_name: "CPD Register",
    description:
      "Attendance registers, verifiable attendance slips, and a CPD record ready for audit or appraisal.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#eef2f6",
    theme_color: "#0e6e6b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
