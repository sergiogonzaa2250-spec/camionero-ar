import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camionero AR",
  description: "Planificación de rutas para transporte pesado en Argentina",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}