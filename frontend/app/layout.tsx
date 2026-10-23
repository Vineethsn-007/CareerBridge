import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerBridge",
  description: "Find jobs that fit, close your skill gaps, and practice interviews.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
