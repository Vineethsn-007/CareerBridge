import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shell/Navbar";
import { Footer } from "@/components/shell/Footer";
import { RouteTransition } from "@/components/shell/RouteTransition";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerBridge | AI Career Acceleration for Indian Students",
  description:
    "Match with verified jobs, pinpoint skill gaps, and practice AI mock interviews tailored for freshers and students across India.",
  keywords: [
    "CareerBridge",
    "fresher jobs India",
    "verified jobs",
    "AI interview practice",
    "skill gap analysis",
    "resume parser",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="bg-bg text-text min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-white antialiased">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <RouteTransition>{children}</RouteTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}
