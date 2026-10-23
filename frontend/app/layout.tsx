import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shell/Navbar";
import { Footer } from "@/components/shell/Footer";
import { RouteTransition } from "@/components/shell/RouteTransition";
import { CustomCursor } from "@/components/motion/CustomCursor";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://careerbridge.in"),
  title: "CareerBridge | Your Skills. Your Future. Your CareerBridge.",
  description:
    "Discover relevant jobs, identify skill gaps, and build personalized preparation plans with AI — tailored for students, fresh graduates, and aspiring professionals.",
  keywords: [
    "CareerBridge",
    "fresher jobs India",
    "verified jobs",
    "AI interview practice",
    "skill gap analysis",
    "resume parser",
    "career planning",
  ],
  openGraph: {
    title: "CareerBridge | Your Skills. Your Future. Your CareerBridge.",
    description:
      "Discover relevant jobs, identify skill gaps, and build personalized preparation plans with AI — tailored for students, fresh graduates, and aspiring professionals.",
    siteName: "CareerBridge",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerBridge | Your Skills. Your Future. Your CareerBridge.",
    description:
      "Discover relevant jobs, identify skill gaps, and build personalized preparation plans with AI — tailored for students, fresh graduates, and aspiring professionals.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontSerif.variable}`}>
      <body className="bg-merino text-primary-text min-h-screen flex flex-col font-sans selection:bg-rock-blue/40 selection:text-deep-teal antialiased">
        <CustomCursor />
        <Navbar />
        <main className="flex-1 flex flex-col">
          <RouteTransition>{children}</RouteTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}
