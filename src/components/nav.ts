import {
  Briefcase,
  Clock,
  FileSignature,
  FileText,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string;
  adminOnly?: boolean;
  group: "Personal" | "Workspace";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard, color: "#fdab3d", adminOnly: true, group: "Personal" },
  { href: "/applications", label: "Job Applications", icon: Briefcase, color: "#00c875", adminOnly: true, group: "Personal" },
  { href: "/time-tracker", label: "Time Tracker", icon: Clock, color: "#579bfc", group: "Personal" },
  { href: "/insights", label: "Insights", icon: LineChart, color: "#a25ddc", adminOnly: true, group: "Personal" },
  { href: "/job-search", label: "Job Search", icon: Search, color: "#00d2d2", adminOnly: true, group: "Personal" },
  { href: "/sops", label: "SOPs", icon: FileText, color: "#ff5ac4", group: "Workspace" },
  { href: "/contracts", label: "Contracts", icon: FileSignature, color: "#ffcb00", group: "Workspace" },
  { href: "/applicants", label: "Applicants", icon: Users, color: "#e2445c", adminOnly: true, group: "Workspace" },
  { href: "/team", label: "Team", icon: UserPlus, color: "#784bd1", adminOnly: true, group: "Workspace" },
];

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");
}
