"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";

export default function Home() {
  const { ready, currentUser } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace("/login");
    } else {
      router.replace(currentUser.role === "admin" ? "/dashboard" : "/contracts");
    }
  }, [ready, currentUser, router]);

  return (
    <div className="flex h-screen items-center justify-center text-neutral-500">
      Loading…
    </div>
  );
}
