import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "inkthread — a document, as a graph of what depends on what",
  description:
    "Upload a PDF. inkthread reads it, then rules and agents thread every part to what it defines, cites, governs and overrides — each thread grounded in the page's own words.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
    >
      <body className="relative bg-background text-foreground bg-grid bg-scanlines">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
