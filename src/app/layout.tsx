import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { SITE } from "@/lib/site/config";
import { ROOT_VIEWPORT, rootMetadata } from "@/lib/site/metadata";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = rootMetadata(SITE);
export const viewport: Viewport = ROOT_VIEWPORT;

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
