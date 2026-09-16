import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { Avatar3DStyles } from "@/components/avatar-3d";
import "./globals.css";
import "./avatar-clothing.css";
const manrope = localFont({ src: "../../public/fonts/manrope.ttf", variable: "--font-manrope", display: "swap", weight: "200 800" });
export const metadata: Metadata = {
  metadataBase: new URL("https://gxhubofficemeet.vercel.app"),
  alternates: { canonical: "/" },
  title: "GX Hub — Seu escritório, sem fronteiras",
  description: "O escritório virtual do ecossistema Grupo X. Conecte pessoas, compartilhe ideias e construa resultados em salas de voz e vídeo.",
  applicationName: "GX Hub",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body>
        <Avatar3DStyles />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
