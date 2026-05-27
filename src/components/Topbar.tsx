"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { format } from "date-fns";
import { useData } from "@/lib/store";
import { NAV_ITEMS } from "./nav";

export default function Topbar() {
  const pathname = usePathname();
  const { currentUser, contracts } = useData();
  if (!currentUser) return null;

  const current = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  const pending =
    currentUser.role === "admin"
      ? contracts.filter((c) => c.status === "pending").length
      : contracts.filter(
          (c) => c.assignedToId === currentUser.id && c.status === "pending"
        ).length;

  return (
    <header className="z-10 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-bg-card px-4 sm:px-6">
      <div className="hidden items-center gap-2 text-sm sm:flex">
        <span className="text-neutral-400">JCAT Media</span>
        <span className="text-neutral-300">/</span>
        <span className="font-semibold text-neutral-900">
          {current?.label ?? "Dashboard"}
        </span>
      </div>

      <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          className="h-9 w-full rounded-lg border border-line bg-bg-soft pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-brand focus:bg-bg-card"
          placeholder="Search…"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <span className="hidden rounded-lg bg-bg-soft px-3 py-1.5 text-xs font-medium text-neutral-500 lg:block">
          {format(new Date(), "EEE, MMM d")}
        </span>
        <Link
          href="/contracts"
          className="relative rounded-lg p-2 text-neutral-500 hover:bg-bg-hover hover:text-neutral-900"
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {pending > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white">
              {pending}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: currentUser.avatarColor ?? "#0073ea" }}
          >
            {currentUser.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span className="hidden text-sm font-medium text-neutral-900 sm:block">
            {currentUser.name.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
