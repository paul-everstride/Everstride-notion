"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/types";
import { LayoutDashboard, ArrowLeftRight, Users, User, Eye, ChevronRight, Shield, LogOut } from "lucide-react";

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; icon: React.ReactNode; children?: NavChild[] };

const coachItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  {
    href: "/compare",
    label: "Compare",
    icon: <ArrowLeftRight size={15} />,
    children: [
      { href: "/compare/readiness",   label: "Readiness"   },
      { href: "/compare/performance", label: "Performance" }
    ]
  },
  { href: "/athletes", label: "Athletes", icon: <Users size={15} /> },
  { href: "/teams",    label: "Teams",    icon: <Shield size={15} /> },
];

const athleteItems: NavItem[] = [
  { href: "/me",        label: "My Metrics", icon: <User size={15} /> },
  { href: "/dashboard", label: "Coach View", icon: <Eye size={15} /> }
];

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = role === "athlete" ? athleteItems : coachItems;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 border-r border-line bg-surface lg:flex flex-col">
      {/* Workspace header */}
      <div className="px-3 py-3 flex items-center gap-2.5 border-b border-line">
        <div className="w-6 h-6 rounded-md bg-ink flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-semibold">E</span>
        </div>
        <span className="text-sm font-semibold text-ink">Everstride</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const parentActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.href}>
              <Link
                href={hasChildren ? item.children![0].href : item.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors duration-100",
                  parentActive
                    ? "bg-surfaceStrong text-ink font-medium"
                    : "text-muted hover:text-ink hover:bg-surfaceStrong"
                )}
              >
                <span className={cn("shrink-0", parentActive ? "text-ink" : "text-muted/70")}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <ChevronRight size={13} className={cn("shrink-0 transition-transform", parentActive ? "rotate-90 text-ink" : "text-muted/50")} />
                )}
              </Link>

              {/* Sub-items */}
              {hasChildren && parentActive && (
                <div className="ml-7 mt-0.5 mb-1 space-y-0.5">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm rounded-md transition-colors duration-100",
                          childActive
                            ? "text-ink font-medium bg-surfaceStrong"
                            : "text-muted hover:text-ink hover:bg-surfaceStrong"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-line space-y-1">
        <p className="text-xs text-muted capitalize">{role}</p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-muted hover:text-ink transition w-full py-1"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
