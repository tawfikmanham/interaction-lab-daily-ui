import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payment Button Demo",
  description: "A beautiful payment button with success animation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
