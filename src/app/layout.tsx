import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cpdregister.app";

export const metadata: Metadata = {
  // Canonicals and social images need an absolute origin.
  metadataBase: new URL(SITE),
  title: {
    default: "CPD Register",
    // Pages set their own title; this keeps the product name on all of them.
    template: "%s — CPD Register",
  },
  description:
    "Attendance registers, verifiable attendance slips, and a regulator-ready CPD record for professionals with CPD obligations.",
  applicationName: "CPD Register",
  openGraph: {
    title: "CPD Register",
    description:
      "CPD evidence that captures itself — attendance registers, verifiable slips, and a record ready for audit or appraisal.",
    siteName: "CPD Register",
    locale: "en_GB",
    type: "website",
  },
  // Private by default, opted out page by page. Attendee names appear on slips
  // and verification pages reachable by code, and a record page is somebody's
  // professional history — so a new page is excluded from search unless it
  // deliberately says otherwise. Only /, /privacy and /terms do.
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e6e6b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <SiteHeader />
        {/* One column for the page and its footer, so the navigation rail sits
            beside the whole column rather than beside the page only. */}
        <div className="site-main">
          {children}
          <SiteFooter />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
