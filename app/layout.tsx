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

export const metadata: Metadata = {
  title: "Hayyaun — Frontend development & interactive 3D",
  description: "Selected work by Hayyaun. Frontend development, motion, and interactive 3D with clarity, depth, and character.",
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3100"),
  openGraph: {
    title: "Hayyaun — Clarity. Depth. Character.",
    description: "Frontend development, motion, and interactive 3D.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
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
