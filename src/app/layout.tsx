import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/pwa";
import "./globals.css";
import "./mobile.css";
export const metadata: Metadata = {
  title: "Paskibra SMKN 5 Jakarta",
  description: "Absensi latihan, penilaian, dan penghargaan anggota Paskibra.",
  appleWebApp: { capable: true, title: "Paskibra", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2454ac",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
