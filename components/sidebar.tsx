"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/types";
import { LayoutDashboard, ArrowLeftRight, Users, User, Eye, ChevronRight, LogOut, CalendarRange, ExternalLink } from "lucide-react";

/** Shield with bold horizontal slider lines — Team Settings icon readable at any size */
function ShieldSettingsIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Shield */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {/* Top slider line */}
      <line x1="9.5" y1="10.5" x2="14.5" y2="10.5" />
      {/* Bottom slider line */}
      <line x1="9.5" y1="14"   x2="14.5" y2="14" />
      {/* Knob on top line (left) */}
      <circle cx="11.5" cy="10.5" r="1.4" />
      {/* Knob on bottom line (right) */}
      <circle cx="13"   cy="14"   r="1.4" />
    </svg>
  );
}

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; icon: React.ReactNode; children?: NavChild[]; external?: boolean };

const PLANNER_BASE = process.env.NEXT_PUBLIC_PLANNER_URL ?? "https://planner.everstride.fit";

function buildCoachItems(coachId?: string, coachName?: string): NavItem[] {
  const plannerUrl = coachId
    ? `${PLANNER_BASE}?coach_id=${encodeURIComponent(coachId)}&coach_name=${encodeURIComponent(coachName ?? "")}`
    : PLANNER_BASE;
  return [
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
    { href: "/teams",    label: "Team Settings", icon: <ShieldSettingsIcon size={15} /> },
    { href: plannerUrl, label: "Season Planner", icon: <CalendarRange size={15} />, external: true },
  ];
}

const athleteItems: NavItem[] = [
  { href: "/me",        label: "My Metrics", icon: <User size={15} /> },
  { href: "/dashboard", label: "Coach View", icon: <Eye size={15} /> }
];

export function Sidebar({ role, coachId, coachName }: { role: AppRole; coachId?: string; coachName?: string }) {
  const pathname = usePathname();
  const items = role === "athlete" ? athleteItems : buildCoachItems(coachId, coachName);

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
          const parentActive = !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          const hasChildren = item.children && item.children.length > 0;

          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors duration-100 text-muted hover:text-ink hover:bg-surfaceStrong"
              >
                <span className="shrink-0 text-muted/70">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <ExternalLink size={11} className="shrink-0 text-muted/40" />
              </a>
            );
          }

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
