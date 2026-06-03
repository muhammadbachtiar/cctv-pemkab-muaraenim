import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/auth-context";

export const metadata: Metadata = {
  title: "CCTV Monitoring System Pemerintah Kabupaten Muara Enim",
  description: "Sistem monitoring CCTV Pemerintah Kabupaten Muara Enim",
  icons: {
    icon: "/logo_muara_enim.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
