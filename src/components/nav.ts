import {
  Briefcase,
  Clock,
  FileSignature,
  FileText,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  Search,
  UserCircle,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";
import { Role } from "@/lib/types";

import { User } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
  adminOnly?: boolean;
  /** Extra titles (beyond admins) that should be able to see this item. */
  extraTitles?: string[];
  /** When set, ONLY users with these titles can see it (admins excluded). */
  titlesOnly?: string[];
  group: "Personal" | "Workspace";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard, color: "#fdab3d", adminOnly: true, group: "Personal" },
  { href: "/applications", label: "Job Applications", icon: Briefcase, color: "#00c875", adminOnly: true, extraTitles: ["Application Specialist"], group: "Personal" },
  { href: "/time-tracker", label: "Time Tracker", icon: Clock, color: "#579bfc", group: "Personal" },
  { href: "/insights", label: "Insights", icon: LineChart, color: "#a25ddc", adminOnly: true, group: "Personal" },
  { href: "/job-search", label: "Job Search", icon: Search, color: "#00d2d2", adminOnly: true, extraTitles: ["Application Specialist", "Medical Coder"], group: "Personal" },
  { href: "/documents", label: "Document Studio", icon: Wand2, color: "#06b6d4", titlesOnly: ["Application Specialist"], group: "Personal" },
  { href: "/account", label: "My Account", icon: UserCircle, color: "#22c55e", group: "Personal" },
  { href: "/sops", label: "SOPs", icon: FileText, color: "#ff5ac4", group: "Workspace" },
  { href: "/contracts", label: "Contracts", icon: FileSignature, color: "#ffcb00", group: "Workspace" },
  { href: "/applicants", label: "Applicants", icon: Users, color: "#e2445c", adminOnly: true, group: "Workspace" },
  { href: "/team", label: "Team", icon: UserPlus, color: "#784bd1", adminOnly: true, group: "Workspace" },
];

export function canSee(item: NavItem, user: User): boolean {
  // Strict title-only items: only listed titles can see, admins included only if listed.
  if (item.titlesOnly) {
    return item.titlesOnly.includes(user.title ?? "");
  }
  if (!item.adminOnly) return true;
  if (user.role === "admin") return true;
  return Boolean(item.extraTitles?.includes(user.title ?? ""));
}

export function visibleNav(user: User): NavItem[] {
  return NAV_ITEMS.filter((i) => canSee(i, user));
}

export function canAccessPath(pathname: string, user: User): boolean {
  const item = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );
  if (!item) return true;
  return canSee(item, user);
}
