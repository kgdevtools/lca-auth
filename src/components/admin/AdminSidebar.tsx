"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, UserCircle, Menu, ChevronLeft, Phone,
  ChevronDown, Database, GraduationCap, Mail,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen: boolean;
}

// ── Nav structure ────────────────────────────────────────────────────────────

const overviewItem: NavItem = {
  title: "Overview",
  href: "/admin/admin-dashboard",
  icon: Home,
};

const navGroups: NavGroup[] = [
  {
    id: "lca",
    label: "LCA Database",
    icon: Database,
    items: [
      { title: "Tournaments", href: "/admin/admin-dashboard/tournaments" },
    ],
    defaultOpen: true,
  },
  {
    id: "academy",
    label: "Academy",
    icon: GraduationCap,
    items: [
      { title: "Registrations",  href: "/admin/admin-dashboard/registrations" },
      { title: "Assign Roles",  href: "/academy/admin/assignments" },
    ],
    defaultOpen: true,
  },
  {
    id: "users",
    label: "User Management",
    icon: UserCircle,
    items: [
      { title: "Users", href: "/admin/admin-dashboard/profiles", icon: UserCircle },
    ],
    defaultOpen: true,
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: Mail,
    items: [
      { title: "Contacts", href: "/admin/admin-dashboard/contacts", icon: Phone },
    ],
    defaultOpen: false,
  },
];

// ── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  isCollapsed,
  onClick,
  indent = false,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  indent?: boolean;
}) {
  const Icon = item.icon;

  // In collapsed (icon-only) mode, skip items that have no icon
  if (isCollapsed && !Icon) return null;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={isCollapsed ? item.title : undefined}
      className={cn(
        "flex items-center px-2.5 py-1.5 rounded-sm transition-all duration-150 truncate",
        isCollapsed ? "justify-center" : "",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-accent/50"
      )}
    >
      {Icon && isCollapsed && (
        <Icon className="flex-shrink-0 w-5 h-5" />
      )}
      {!isCollapsed && (
        <>
          {Icon && <Icon className="flex-shrink-0 w-3.5 h-3.5 mr-2" />}
          <span className={cn(
            "font-mono font-bold text-[13.5px] tracking-tightest leading-tight truncate",
            !Icon && indent ? "pl-0" : ""
          )}>{item.title}</span>
        </>
      )}
    </Link>
  );
}

// ── SidebarContent ───────────────────────────────────────────────────────────

function SidebarContent({
  isCollapsed,
  user,
  profile,
  pathname,
  openGroups,
  onToggleGroup,
  onToggleCollapse,
  onNavClick,
}: {
  isCollapsed: boolean;
  user: any;
  profile: any;
  pathname: string;
  openGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  onToggleCollapse?: () => void;
  onNavClick?: () => void;
}) {
  const isItemActive = (href: string) =>
    pathname === href ||
    (href !== "/admin/admin-dashboard" && pathname.startsWith(href));

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isItemActive(item.href));

  return (
    <>
      {/* Header */}
      <div className="px-3 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tighter leading-tight font-mono">
                Chess Academy
              </h1>
              <p className="text-xs text-muted-foreground tracking-tight leading-tight">
                Admin Dashboard
              </p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-sm hover:bg-accent/50 transition-colors"
          >
            {isCollapsed ? (
              <Menu className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 overflow-x-hidden">
        {/* Overview — standalone */}
        <NavLink
          item={overviewItem}
          isActive={isItemActive(overviewItem.href)}
          isCollapsed={isCollapsed}
          onClick={onNavClick}
        />

        {/* Groups */}
        {navGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? group.defaultOpen;
          const groupIsActive = isGroupActive(group);
          const GroupIcon = group.icon;

          if (isCollapsed) {
            // Icon-only mode: flat list with thin group dividers
            return (
              <div key={group.id}>
                <div className="my-2 border-t border-border/30" />
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isItemActive(item.href)}
                    isCollapsed
                    onClick={onNavClick}
                  />
                ))}
              </div>
            );
          }

          return (
            <div key={group.id} className="mt-3">
              {/* Group header — collapsible toggle */}
              <button
                onClick={() => onToggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2 py-1 rounded-sm hover:bg-accent/20 transition-colors text-left mb-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <GroupIcon
                    className={cn(
                      "w-3 h-3 flex-shrink-0",
                      groupIsActive ? "text-foreground" : "text-muted-foreground/50"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold tracking-widest uppercase",
                      groupIsActive ? "text-foreground" : "text-muted-foreground/50"
                    )}
                  >
                    {group.label}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-muted-foreground/40 flex-shrink-0",
                    "transition-transform duration-200 ease-in-out",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Animated items */}
              <div
                style={{
                  maxHeight: isOpen ? `${group.items.length * 44}px` : "0px",
                  overflow: "hidden",
                  transition: "max-height 220ms ease-in-out",
                }}
              >
                <div className="ml-2 pl-3 border-l border-border/40 space-y-0.5 pb-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      isActive={isItemActive(item.href)}
                      isCollapsed={false}
                      onClick={onNavClick}
                      indent
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Profile footer */}
      <div className="px-3 py-3 border-t border-border">
        <Link
          href="/user/profile"
          title={isCollapsed ? (profile?.full_name || "My Profile") : undefined}
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-sm hover:bg-accent/50 transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <Avatar
            name={profile?.full_name || user?.email || "Admin"}
            size={32}
            className="flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate tracking-tight leading-tight">
                {profile?.full_name || "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate tracking-tight leading-tight">
                {user?.email}
              </p>
            </div>
          )}
        </Link>
      </div>
    </>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState<any>(null);
  const [profile, setProfile]       = useState<any>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.id, g.defaultOpen]))
  );
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
    }
    fetchUser();
  }, []);

  const handleToggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const sharedProps = {
    user,
    profile,
    pathname,
    openGroups,
    onToggleGroup: handleToggleGroup,
  };

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

      {/* Mobile sidebar — always expanded, ignores collapsed state */}
      <div
        className={cn(
          "fixed top-20 bottom-0 left-0 z-50 flex flex-col lg:hidden",
          "w-72 bg-background border-r border-border shadow-xl",
          "transform transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          {...sharedProps}
          isCollapsed={false}
          onToggleCollapse={() => setMobileOpen(false)}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col",
          "fixed top-20 bottom-0 left-0 z-30",
          collapsed ? "w-16" : "w-72",
          "bg-background border-r border-border shadow-lg",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <SidebarContent
          {...sharedProps}
          isCollapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Desktop spacer */}
      <div
        className={cn(
          "hidden lg:block flex-shrink-0 transition-all duration-300",
          collapsed ? "w-16" : "w-72"
        )}
      />
    </>
  );
}
