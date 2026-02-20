"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "../../components/DbProvider";
import { TabBar } from "../../components/TabBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated } = useDb();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return null; // Or a sleek loading skeleton in the future
  }

  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <TabBar />
    </div>
  );
}
