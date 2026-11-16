import type { Metadata } from "next";
import { Michroma, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/layout/theme-sync";

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
      <body className={`${outfit.className} antialiased`} suppressHydrationWarning>
        {/* Apply the saved theme before first paint so there is no light flash on themed pages. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=location.pathname;if(!/^\\/(w|embed|room|replay)\\//.test(p)&&JSON.parse(localStorage.getItem("theme")||"false")===true)document.body.classList.add("dark")}catch(e){}`,
          }}
        />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
