import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import RegisterSW from "@/components/RegisterSW";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE = "Habit Tracker Calendar";
const DESC =
  "Track habits on a Day / Week / Month / Year calendar. Filter the calendar by habit and see how often you actually show up.";

// Vercel injects the deployment host; fall back to localhost when developing.
const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: SITE, template: `%s · ${SITE}` },
  description: DESC,
  applicationName: SITE,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Habits", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: SITE,
    description: DESC,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE }],
  },
  twitter: { card: "summary_large_image", title: SITE, description: DESC, images: ["/og.png"] },
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Locked so a double-tap on a calendar cell logs a habit instead of zooming.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
