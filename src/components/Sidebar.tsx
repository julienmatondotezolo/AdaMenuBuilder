import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn, AdaLogo, Avatar, AvatarFallback } from "ada-design-system";
import { useAuth } from "../context/AuthContext";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getUserInitials(user: {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
}): string {
  if (user.full_name)
    return user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (user.first_name && user.last_name)
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  if (user.first_name) return user.first_name.slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

function getUserDisplayName(user: {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
}): string {
  if (user.full_name) return user.full_name;
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return user.email.split("@")[0];
}

/* ── Tooltip wrapper for collapsed state ─────────────────────────────────── */

function Tooltip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative group/tip">
      {children}
      {show && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-lg">
          {label}
          {/* Arrow */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      )}
    </div>
  );
}

/* ── Nav items config ────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

/* ── Component ───────────────────────────────────────────────────────────── */

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Close user menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    if (showUserMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  /* Keyboard shortcut: Cmd/Ctrl + B */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <div className="relative h-full shrink-0 w-[60px]">
      {/* Overlay backdrop when expanded */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/10 transition-opacity"
          onClick={() => setCollapsed(true)}
        />
      )}
      <aside
        className={cn(
          "absolute top-0 left-0 h-full flex flex-col bg-white border-r border-gray-300 shadow-sm transition-[width] duration-200 ease-in-out select-none overflow-x-auto overflow-y-hidden",
          collapsed ? "w-[60px] z-10" : "w-[220px] z-50 shadow-xl",
        )}
      >
      {/* ═══ Header: Logo + Toggle ═══════════════════════════════════════ */}
      <div className={cn(
        "flex items-center h-14 shrink-0 border-b border-gray-100",
        collapsed ? "justify-center" : "px-3 justify-between",
      )}>
        <div className={cn(
          "flex items-center gap-2 min-w-0 overflow-hidden",
          collapsed && "justify-center w-full",
        )}>
          <AdaLogo size="sm" variant="primary" className="shrink-0 w-7 h-7" />
          <span className={cn(
            "font-semibold text-[13px] text-gray-900 truncate transition-opacity duration-200",
            collapsed ? "w-0 opacity-0" : "opacity-100",
          )}>
            Menu Builder <span className="text-blue-600 font-bold">AI</span>
          </span>
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            title="Collapse (⌘B)"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ═══ User profile section ════════════════════════════════════════ */}
      <div
        ref={userMenuRef}
        className={cn("relative", collapsed ? "px-1.5 py-2" : "px-2 py-2")}
      >
        <Tooltip label={user ? getUserDisplayName(user) : "Profile"} show={collapsed}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center w-full rounded-lg transition-colors",
              collapsed
                ? "justify-center p-2 hover:bg-gray-100"
                : "gap-2.5 px-2 py-2 hover:bg-gray-50",
            )}
          >
            <Avatar className="h-7 w-7 shrink-0 ring-1 ring-gray-200">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] font-bold">
                {user ? getUserInitials(user) : "?"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && user && (
              <>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gray-900 truncate leading-tight">
                    {getUserDisplayName(user)}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate leading-tight">
                    {user.email}
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform",
                  showUserMenu && "rotate-180",
                )} />
              </>
            )}
          </button>
        </Tooltip>

        {/* Dropdown */}
        {showUserMenu && (
          <div className={cn(
            "absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden",
            collapsed ? "left-full top-1 ml-2 w-52" : "left-2 right-2 top-full mt-1",
          )}>
            <div className="px-3 py-2.5 bg-gray-50/80">
              <div className="text-[13px] font-semibold text-gray-900">
                {user ? getUserDisplayName(user) : "User"}
              </div>
              <div className="text-[11px] text-gray-500">{user?.email}</div>
            </div>
            <div className="p-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-2.5 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2.5 rounded-md transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-gray-100" />

      {/* ═══ Navigation ══════════════════════════════════════════════════ */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-2",
        collapsed ? "px-1.5" : "px-2",
      )}>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = activeItem === item.id;
            return (
              <Tooltip key={item.id} label={item.label} show={collapsed}>
                <button
                  onClick={() => setActiveItem(active ? null : item.id)}
                  className={cn(
                    "flex items-center w-full rounded-lg transition-all duration-150",
                    collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2",
                    active
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
                  )}
                >
                  <item.icon className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    active ? "text-white" : "text-gray-400 group-hover:text-gray-600",
                  )} />
                  {!collapsed && (
                    <span className={cn(
                      "text-[13px] truncate",
                      active ? "font-semibold" : "font-medium",
                    )}>
                      {item.label}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </nav>

      {/* ═══ Footer: Collapse toggle (when collapsed) + Logout ═══════════ */}
      <div className={cn(
        "border-t border-gray-100",
        collapsed ? "px-1.5 py-2" : "px-2 py-2",
      )}>
        {collapsed && (
          <Tooltip label="Expand (⌘B)" show>
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-full p-2.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors mb-0.5"
            >
              <ChevronsRight className="w-[18px] h-[18px]" />
            </button>
          </Tooltip>
        )}

        <Tooltip label="Sign out" show={collapsed}>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center w-full rounded-lg transition-colors",
              collapsed
                ? "justify-center p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                : "gap-2.5 px-2.5 py-2 text-gray-400 hover:bg-red-50 hover:text-red-500",
            )}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="text-[13px] font-medium">Sign out</span>}
          </button>
        </Tooltip>
      </div>
    </aside>
    </div>
  );
}
