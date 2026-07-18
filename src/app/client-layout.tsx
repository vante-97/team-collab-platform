"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthProvider>
        <Navbar />
        {children}
      </AuthProvider>
    </Suspense>
  );
}
