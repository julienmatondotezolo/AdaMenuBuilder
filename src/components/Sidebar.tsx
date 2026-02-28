import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  ChevronLeft,
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

/* ── Sidebar width constants ─────────────────────────────────────────────── */

const EXPANDED_W = 220;
const COLLAPSED_W = 60;

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
    <>
      {/* Overlay backdrop when expanded */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-[60] bg-black/10"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Spacer — always takes collapsed width in the flow */}
      <div className="h-full shrink-0" style={{ width: COLLAPSED_W }} />

      {/* Sidebar — fixed position, overlays page when expanded */}
      <div
        className="fixed top-0 left-0 h-full overflow-visible transition-[width] duration-200 ease-in-out"
        style={{
          width: collapsed ? COLLAPSED_W : EXPANDED_W,
          zIndex: collapsed ? 30 : 70,
          boxShadow: collapsed ? "1px 0 0 0 #d1d5db" : "4px 0 12px rgba(0,0,0,0.08), 1px 0 0 0 #d1d5db",
        }}
      >
        <aside
          className="h-full flex flex-col bg-white transition-[width] duration-200 ease-in-out select-none overflow-hidden"
          style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
        >
        {/* ═══ Header: Logo ══════════════════════════════════════════════ */}
        <div className={cn("flex items-center h-14 shrink-0 px-3", !collapsed && "border-b border-gray-100")}>
          <div className="flex items-center gap-2 min-w-0">
            <AdaLogo size="sm" variant="primary" className="shrink-0 w-7 h-7" />
            <span className={cn(
              "font-semibold text-[13px] text-gray-900 whitespace-nowrap transition-opacity duration-200",
              collapsed ? "opacity-0" : "opacity-100",
            )}>
              Menu Builder <span className="text-blue-600 font-bold">AI</span>
            </span>
          </div>
        </div>

        {/* ═══ User profile section ══════════════════════════════════════ */}
        <div ref={userMenuRef} className="relative py-2 px-2">
          <Tooltip label={user ? getUserDisplayName(user) : "Profile"} show={collapsed}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center w-full gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Avatar className="h-7 w-7 shrink-0 ring-1 ring-gray-200">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] font-bold">
                  {user ? getUserInitials(user) : "?"}
                </AvatarFallback>
              </Avatar>
              {user && (
                <>
                  <div className={cn(
                    "text-left min-w-0 flex-1 transition-opacity duration-200",
                    collapsed ? "opacity-0" : "opacity-100",
                  )}>
                    <div className="text-[13px] font-medium text-gray-900 truncate leading-tight whitespace-nowrap">
                      {getUserDisplayName(user)}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate leading-tight whitespace-nowrap">
                      {user.email}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-gray-400 shrink-0 transition-all duration-200",
                      collapsed ? "opacity-0" : "opacity-100",
                      showUserMenu && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>
          </Tooltip>

          {/* Dropdown */}
          {showUserMenu && (
            <div
              className={cn(
                "absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden",
                collapsed
                  ? "left-full top-1 ml-2 w-52"
                  : "left-2 right-2 top-full mt-1",
              )}
            >
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

        {/* ═══ Navigation ════════════════════════════════════════════════ */}
        <nav className="flex-1 py-2 px-2">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = activeItem === item.id;
              return (
                <Tooltip key={item.id} label={item.label} show={collapsed}>
                  <button
                    onClick={() => setActiveItem(active ? null : item.id)}
                    className={cn(
                      "flex items-center w-full gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150",
                      active
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-[18px] h-[18px] shrink-0",
                        active ? "text-white" : "text-gray-400",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[13px] truncate whitespace-nowrap transition-opacity duration-200",
                        collapsed ? "opacity-0" : "opacity-100",
                        active ? "font-semibold" : "font-medium",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </nav>

        {/* ═══ Footer: Logout ════════════════════════════════════════════ */}
        <div className="border-t border-gray-100 py-2 px-2">
          <Tooltip label="Sign out" show={collapsed}>
            <button
              onClick={handleLogout}
              className="flex items-center w-full gap-2.5 px-2.5 py-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              <span className={cn(
                "text-[13px] font-medium whitespace-nowrap transition-opacity duration-200",
                collapsed ? "opacity-0" : "opacity-100",
              )}>Sign out</span>
            </button>
          </Tooltip>
        </div>
      </aside>

        {/* ═══ Toggle button — AFTER aside so it paints on top ═══ */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute top-4 z-20 flex items-center justify-center rounded-full hover:scale-110 transition-all"
          style={{
            right: -14,
            width: 28,
            height: 28,
            backgroundColor: "#fff",
            border: "1px solid #d1d5db",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
          }}
          title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform duration-200",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>
    </>
  );
}
