import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VendAI — Вендинговые аппараты",
  description: "Продажа вендинговых аппаратов для воды и готовых напитков.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
