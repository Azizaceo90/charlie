"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useData } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Topbar from "@/components/Topbar";

const ADMIN_PATHS = [
  "/dashboard",
  "/applications",
  "/insights",
  "/job-search",
  "/applicants",
  "/team",
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, currentUser } = useData();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (
      currentUser.role !== "admin" &&
      ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ) {
      router.replace("/contracts");
    }
  }, [ready, currentUser, pathname, router]);

  if (!ready || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileNav />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
