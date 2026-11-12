import type { Metadata } from "next";
import { Michroma, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
});

export const metadata: Metadata = {
  title: "Webineer",
  description: "Webinar automation and marketing SaaS foundation for live, automated, and replay experiences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${michroma.variable}`}>
      <body className={`${outfit.className} antialiased`}>{children}</body>
    </html>
  );
}
