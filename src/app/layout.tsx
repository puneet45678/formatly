import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import { WorkbenchProvider } from "@/state/WorkbenchContext";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "formatly",
  description: "Format JSON, YAML, Mermaid, XML, SQL and Markdown in one place. Runs entirely in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col font-sans">
        <div className="grid-backdrop" aria-hidden="true" />
        <TopBar />
        <WorkbenchProvider>{children}</WorkbenchProvider>
      </body>
    </html>
  );
}
