"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";

export default function Home() {
  const { ready, currentUser } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(currentUser ? "/dashboard" : "/login");
  }, [ready, currentUser, router]);

  return (
    <div className="flex h-screen items-center justify-center text-neutral-500">
      Loading…
    </div>
  );
}
