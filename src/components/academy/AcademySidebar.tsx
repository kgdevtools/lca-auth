"use client";

import { useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  Users,
  Menu,
  ChevronLeft,
  Loader2,
  Home,
  Settings,
  Trophy,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";

interface SidebarItem {
  title: string;
  href: string;
  icon: any;
  roles?: string[];
}

const baseSidebarItems: SidebarItem[] = [
  { title: "Dashboard",     href: "/academy",              icon: Home      },
];

const studentItems: SidebarItem[] = [
  { title: "Lessons",      href: "/academy/lesson",       icon: BookOpen  },
  { title: "Classroom",    href: "/academy/classroom",    icon: Monitor   },
  { title: "My Reports",   href: "/academy/reports",      icon: BarChart3 },
  { title: "Leaderboard",  href: "/academy/leaderboard",  icon: Trophy    },
];

const coachItems: SidebarItem[] = [
  { title: "Students",      href: "/academy/students",     icon: Users,    roles: ["coach", "admin"] },
  { title: "Create Lesson", href: "/academy/lesson/add",   icon: Settings, roles: ["coach", "admin"] },
];

interface AcademySidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Shared sidebar content ──────────────────────────────────────────────────
// isCollapsed is passed explicitly so the mobile drawer can always render
// as expanded regardless of the desktop collapsed state.

function SidebarContent({
  isCollapsed,
  profile,
  user,
  loadingRoute,
  pathname,
  onNavigate,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  profile: any;
  user: any;
  loadingRoute: string | null;
  pathname: string;
  onNavigate: (href: string) => void;
  onToggleCollapse?: () => void;
}) {
  const sidebarItems = [
    ...baseSidebarItems,
    ...studentItems,
    ...(profile?.role === "coach" || profile?.role === "admin" ? coachItems : []),
  ];

  return (
    <>
      {/* Header */}
      <div className="px-3 py-5 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-foreground tracking-tighter leading-tight font-mono">
                LCA Academy Online
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Learning Platform
              </p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-sm hover:bg-muted transition-colors flex-shrink-0 hidden lg:block"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed
              ? <Menu className="w-4 h-4 text-muted-foreground" />
              : <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            }
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 overflow-x-hidden">
        {sidebarItems.map((item) => {
          const Icon      = item.icon;
          const isActive  = pathname === item.href || (item.href !== "/academy" && pathname.startsWith(item.href));
          const isLoading = loadingRoute === item.href;

          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              disabled={isLoading}
              title={isCollapsed ? item.title : undefined}
              className={`
                w-full flex items-center px-2.5 py-2 rounded-sm text-sm font-medium
                transition-all duration-150 truncate
                ${isCollapsed ? "justify-center" : ""}
                ${isLoading ? "opacity-60 cursor-wait" : ""}
                ${isActive
                  ? "bg-foreground/[0.07] text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              {isLoading ? (
                <Loader2 className={`${isCollapsed ? "w-4 h-4" : "w-4 h-4 mr-2.5"} animate-spin flex-shrink-0`} />
              ) : (
                <Icon className={`${isCollapsed ? "w-4 h-4" : "w-4 h-4 mr-2.5"} flex-shrink-0`} />
              )}
              {!isCollapsed && (
                <span className="tracking-tight leading-tight truncate">{item.title}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile footer — links back to user overview */}
      <div className="px-3 py-3 border-t border-border">
        <Link
          href="/user/profile"
          className={`flex items-center gap-2.5 p-2 rounded-sm hover:bg-muted transition-colors ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? (profile?.full_name || "My Profile") : undefined}
        >
          <Avatar
            name={profile?.full_name || user?.email || "User"}
            size={28}
            className="flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate tracking-tighter leading-tight font-mono">
                {profile?.full_name || user?.email || "User"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight capitalize">
                {profile?.role || "Student"}
              </p>
            </div>
          )}
        </Link>
      </div>
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AcademySidebar({
  collapsed = false,
  onToggleCollapse,
}: AcademySidebarProps) {
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [user, setUser]                 = useState<any>(null);
  const [profile, setProfile]           = useState<any>(null);
  const [, startTransition]             = useTransition();
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles").select("*").eq("id", user.id).single();
        setProfile(profileData);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => { setLoadingRoute(null); }, [pathname]);

  const handleNavigate = (href: string) => {
    setMobileOpen(false);
    if (pathname !== href) {
      setLoadingRoute(href);
      startTransition(() => router.push(href));
    }
  };

  const sharedProps = {
    profile,
    user,
    loadingRoute,
    pathname,
    onNavigate: handleNavigate,
  };

  const expandedW  = "w-56";
  const collapsedW = "w-14";

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-sm bg-background shadow-lg border border-border"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar — always expanded, never collapses */}
      <div className={`
        fixed top-20 bottom-0 left-0 z-50 flex flex-col lg:hidden
        ${expandedW} bg-background border-r border-border shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <SidebarContent
          {...sharedProps}
          isCollapsed={false}
          onToggleCollapse={() => setMobileOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <div className={`
        hidden lg:flex lg:flex-col
        fixed top-20 bottom-0 left-0 z-30
        ${collapsed ? collapsedW : expandedW}
        bg-background border-r border-border
        transition-all duration-300 ease-in-out
      `}>
        <SidebarContent
          {...sharedProps}
          isCollapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Desktop spacer */}
      <div className={`hidden lg:block ${collapsed ? collapsedW : expandedW} flex-shrink-0 transition-all duration-300`} />
    </>
  );
}
