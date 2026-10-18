import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Health",
    template: "%s — Smart Health",
  },
  description:
    "AI-assisted public healthcare operations and medicine supply-chain intelligence platform. Synthetic demo data only — not a real government system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
