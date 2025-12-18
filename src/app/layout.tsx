import { Quicksand } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const quicksand = Quicksand({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${quicksand.variable} antialiased bg-lightBackground dark:bg-darkBackground text-lightText dark:text-darkText`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
