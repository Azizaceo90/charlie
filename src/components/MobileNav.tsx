"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store";
import { visibleNav } from "./nav";

export default function MobileNav() {
  const pathname = usePathname();
  const { currentUser } = useData();
  if (!currentUser) return null;
  const items = visibleNav(currentUser.role);

  return (
    <div className="border-b border-line bg-bg-soft md:hidden">
      <div className="flex gap-1 overflow-x-auto px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-brand/15 text-neutral-900"
                  : "text-neutral-500 hover:bg-bg-hover"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
