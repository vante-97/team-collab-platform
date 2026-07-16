import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Collab Platform",
  description: "全栈协作平台 · Next.js 14 + Flask 3.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
