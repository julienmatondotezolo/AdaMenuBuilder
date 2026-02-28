import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn, AdaLogo, Avatar, AvatarFallback } from "ada-design-system";
import { useAuth } from "../context/AuthContext";

const NAVIGATION_ITEMS = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error("Logout failed:", e); }
    setShowUserMenu(false);
  };

  return (
    <div className="relative h-full shrink-0 flex">
      {/* Sidebar panel */}
      <div
        className={cn(
          "h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ease-in-out",
          collapsed ? "w-[68px]" : "w-[240px]",
        )}
      >
        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex items-center h-16 shrink-0",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <div className={cn("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
            <AdaLogo size="sm" variant="primary" className="shrink-0 w-9 h-9" />
            {!collapsed && (
              <span className="font-semibold text-gray-900 text-sm truncate">
                Menu Builder{" "}
                <span className="text-primary font-bold">AI</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto pt-2 px-2">
          <ul className="space-y-1">
            {/* Profile item */}
            <li>
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  onMouseEnter={() => collapsed && setHoveredItem("profile")}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "flex items-center rounded-xl transition-colors w-full relative",
                    collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                    "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                      {user ? getUserInitials(user) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">
                      {user ? getUserDisplayName(user) : "Profile"}
                    </span>
                  )}
                </button>

                {/* Tooltip (collapsed) */}
                {collapsed && hoveredItem === "profile" && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap z-50 pointer-events-none">
                    {user ? getUserDisplayName(user) : "Profile"}
                  </div>
                )}

                {/* User dropdown */}
                {showUserMenu && (
                  <div
                    className={cn(
                      "absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200",
                      collapsed ? "left-full top-0 ml-2 w-48" : "left-2 right-2 top-full mt-1",
                    )}
                  >
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        {user ? getUserDisplayName(user) : "User"}
                      </div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </li>

            {/* Nav items */}
            {NAVIGATION_ITEMS.map((item) => {
              const active = activeItem === item.id;
              return (
                <li key={item.id} className="relative">
                  <button
                    onClick={() => setActiveItem(item.id)}
                    onMouseEnter={() => collapsed && setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "flex items-center rounded-xl transition-colors w-full",
                      collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                      active
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 shrink-0",
                        active ? "text-gray-900" : "text-gray-400",
                      )}
                    />
                    {!collapsed && (
                      <span className={cn("text-sm truncate", active ? "font-semibold" : "font-medium")}>
                        {item.label}
                      </span>
                    )}
                  </button>

                  {/* Tooltip (collapsed) */}
                  {collapsed && hoveredItem === item.id && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Logout ────────────────────────────────────────────────────── */}
        <div className="p-2 relative">
          <button
            onClick={handleLogout}
            onMouseEnter={() => collapsed && setHoveredItem("logout")}
            onMouseLeave={() => setHoveredItem(null)}
            className={cn(
              "flex items-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sign out</span>}
          </button>

          {/* Tooltip (collapsed) */}
          {collapsed && hoveredItem === "logout" && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap z-50 pointer-events-none">
              Sign out
            </div>
          )}
        </div>
      </div>

      {/* ── Collapse toggle (on the border edge) ───────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 -right-3.5 z-40 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 hover:shadow transition-all"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
