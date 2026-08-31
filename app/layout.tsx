import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camionero AR",
  description: "Planificador de rutas para transporte pesado en Argentina",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
