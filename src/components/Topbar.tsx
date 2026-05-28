"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  FileSignature,
  LogOut,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { useData } from "@/lib/store";
import { NAV_ITEMS } from "./nav";
import { ago } from "@/lib/format";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    notifications,
    unreadCount,
    markNotificationsRead,
    refreshNotifications,
    impersonator,
    stopImpersonating,
  } = useData();
  const [open, setOpen] = useState(false);
  if (!currentUser) return null;

  const current = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      refreshNotifications();
      if (unreadCount > 0) markNotificationsRead();
    }
  }

  return (
    <>
      {impersonator && (
        <div className="z-20 flex items-center justify-between gap-3 border-b border-accent-amber/40 bg-accent-amber/15 px-4 py-2 text-xs sm:px-6">
          <span className="text-neutral-800">
            Signed in as <strong>{currentUser.name}</strong> · viewing as{" "}
            <strong>{impersonator.name}</strong>
          </span>
          <button
            onClick={stopImpersonating}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-black"
          >
            <LogOut className="h-3 w-3" /> Return to admin
          </button>
        </div>
      )}
    <header className="z-20 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-bg-card px-4 sm:px-6">
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

        <div className="relative">
          <button
            onClick={toggle}
            className="relative rounded-lg p-2 text-neutral-500 hover:bg-bg-hover hover:text-neutral-900"
            title="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-bg-card shadow-pop">
                <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-neutral-900">
                  Notifications
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-neutral-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon =
                        n.type === "contract_signed"
                          ? CheckCircle2
                          : FileSignature;
                      const inner = (
                        <div className="flex gap-3 px-4 py-3 hover:bg-bg-hover">
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              n.type === "contract_signed"
                                ? "bg-accent-green/15 text-accent-green"
                                : "bg-brand/15 text-brand"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-neutral-900">
                              {n.title}
                            </div>
                            {n.body && (
                              <div className="text-xs text-neutral-500">
                                {n.body}
                              </div>
                            )}
                            <div className="mt-0.5 text-[11px] text-neutral-400">
                              {ago(n.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                      return n.link ? (
                        <button
                          key={n.id}
                          onClick={() => {
                            setOpen(false);
                            router.push(n.link!);
                          }}
                          className="block w-full text-left"
                        >
                          {inner}
                        </button>
                      ) : (
                        <div key={n.id}>{inner}</div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
    </>
  );
}
