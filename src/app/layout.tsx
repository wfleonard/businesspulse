import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { appUrl } from "@/lib/aeo/emails";
import { SITE_META_DESCRIPTION } from "@/lib/resources/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// A function, not a constant, so metadataBase reads the site's URL at request
// time rather than at build time. Share images resolve against it.
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(appUrl("/")),
    title: "BusinessPulse",
    description: SITE_META_DESCRIPTION,
    twitter: { card: "summary_large_image" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
