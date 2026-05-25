"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, currentUser } = useData();
  const router = useRouter();

  useEffect(() => {
    if (ready && !currentUser) router.replace("/login");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
