import {
  Briefcase,
  Clock,
  FileSignature,
  FileText,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  Search,
  Users,
} from "lucide-react";
import { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  group: "Personal" | "Workspace";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard, group: "Personal" },
  { href: "/applications", label: "Job Applications", icon: Briefcase, group: "Personal" },
  { href: "/time-tracker", label: "Time Tracker", icon: Clock, group: "Personal" },
  { href: "/insights", label: "Insights", icon: LineChart, group: "Personal" },
  { href: "/job-search", label: "Job Search", icon: Search, group: "Personal" },
  { href: "/sops", label: "SOPs", icon: FileText, group: "Workspace" },
  { href: "/contracts", label: "Contracts", icon: FileSignature, group: "Workspace" },
  { href: "/applicants", label: "Applicants", icon: Users, adminOnly: true, group: "Workspace" },
];

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");
}
