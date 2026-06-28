import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lensmint — Creator Marketplace",
  description: "Performance-based, AI-verified creator campaigns for Nigeria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
