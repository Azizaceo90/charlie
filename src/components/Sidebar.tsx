"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useData } from "@/lib/store";
import { visibleNav } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useData();
  if (!currentUser) return null;

  const items = visibleNav(currentUser.role);
  const groups = ["Personal", "Workspace"] as const;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-bg-soft md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Career Ops</div>
          <div className="text-[11px] text-slate-500">JCAT Media LLC</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {groups.map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group}>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group}
              </div>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-brand/15 text-white"
                          : "text-slate-400 hover:bg-bg-hover hover:text-slate-200"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] ${
                          active ? "text-brand-soft" : ""
                        }`}
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

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: currentUser.avatarColor ?? "#6366f1" }}
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
            <div className="truncate text-[11px] capitalize text-slate-500">
              {currentUser.role}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="rounded-md p-1.5 text-slate-400 hover:bg-bg-hover hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
