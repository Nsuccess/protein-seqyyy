import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Aging Protein Research Platform";
const siteDescription =
  "AI-powered search across aging-related proteins and scientific literature. Explore 3D molecular structures and discover connections to aging theories.";

export const metadata: Metadata = {
  metadataBase: new URL("https://aging-protein-rag.vercel.app"),
  title: {
    default: siteTitle,
    template: "%s | Aging Proteins",
  },
  description: siteDescription,
  keywords: [
    "aging",
    "proteins",
    "longevity",
    "bioinformatics",
    "RAG",
    "molecular biology",
    "3D structure",
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: "Aging Protein Research",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
