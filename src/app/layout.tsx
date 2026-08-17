import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorker } from "@/components/service-worker";
import { railInitScript } from "@/components/rail-toggle";

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
  manifest: "/manifest.webmanifest",
  // iOS reads these rather than the manifest when adding to the home screen.
  appleWebApp: { capable: true, title: "CPD Register", statusBarStyle: "default" },
  openGraph: {
    title: "CPD Register",
    description:
      "CPD evidence that captures itself — attendance registers, verifiable slips, and a record ready for audit or appraisal.",
    siteName: "CPD Register",
    locale: "en_GB",
    type: "website",
  },
  // Without this a shared link falls back to a small square thumbnail on X,
  // which is the difference between a link that gets clicked and one that
  // does not. The image itself is opengraph-image.tsx.
  twitter: {
    card: "summary_large_image",
    title: "CPD Register",
    description:
      "CPD evidence that captures itself — attendance registers, verifiable slips, and a record ready for audit or appraisal.",
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
  // Required before env(safe-area-inset-*) reports anything but zero. Installed
  // on an iPhone, the app owns the whole screen including the strip the home
  // indicator sits in, so the layout has to know where that strip is.
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        {/* Before the first paint: a rail put away on the last visit must not
            appear and then vanish. */}
        <script dangerouslySetInnerHTML={{ __html: railInitScript }} />
      </head>
      <body>
        <SiteHeader />
        {/* One column for the page and its footer, so the navigation rail sits
            beside the whole column rather than beside the page only. */}
        <div className="site-main">
          {children}
          <SiteFooter />
        </div>
        <ServiceWorker />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
