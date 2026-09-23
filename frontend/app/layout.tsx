import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VendAI — Vending Machines",
  description: "Vending machine sales platform with AI customer assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
