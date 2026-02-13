import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Joppa — mooie vacatures, zonder gedoe",
  description:
    "Maak stap‑voor‑stap een strakke vacature. Joppa maakt teksten per kanaal + visuals, jij keurt goed en deelt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
