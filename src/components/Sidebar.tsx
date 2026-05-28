"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useData } from "@/lib/store";
import { visibleNav } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useData();
  if (!currentUser) return null;

  const items = visibleNav(currentUser);
  const groups = ["Personal", "Workspace"] as const;

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#1c1f3a] text-slate-300 md:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">Career Ops</div>
          <div className="text-[11px] text-slate-400">Workspace</div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-amber to-accent-red text-xs font-bold text-white">
          J
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">
            JCAT Media LLC
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {groups.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group}>
              {currentUser.role === "admin" && (
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group}
                </div>
              )}
              <div className="space-y-0.5">
                {groupItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <Icon
                        className="h-[18px] w-[18px] shrink-0"
                        style={{ color: item.color }}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: currentUser.avatarColor ?? "#0073ea" }}
          >
            {currentUser.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {currentUser.name}
            </div>
            <div className="truncate text-[11px] capitalize text-slate-400">
              {currentUser.role}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
