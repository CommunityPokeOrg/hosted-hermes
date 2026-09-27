import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hosted Hermes",
  description: "Dashboard and provisioning for hosted Hermes agent instances",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
