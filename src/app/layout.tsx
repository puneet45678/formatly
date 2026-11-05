import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import KineticGrid from "@/components/ui/kinetic-grid";
import { CONTENT_SECURITY_POLICY } from "@/lib/csp";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import { WorkbenchProvider } from "@/state/WorkbenchContext";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

const base = siteUrl();

export const metadata: Metadata = {
  // Lets pages give canonical and Open Graph URLs as paths. Only when the site URL is known.
  ...(base ? { metadataBase: new URL(base) } : {}),
  title: { default: `${SITE_NAME}: JSON, YAML, XML, SQL, Markdown and Mermaid formatters`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        {/* Production only: the dev server needs eval and a WebSocket for hot reload. */}
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        )}
      </head>
      <body className="flex h-dvh flex-col font-sans">
        <KineticGrid />
        <TopBar />
        <WorkbenchProvider>
          {/* Scrolls under the top bar: a format page puts its tool at full height, with its guide below. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </WorkbenchProvider>
      </body>
    </html>
  );
}
