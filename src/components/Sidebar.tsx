import { useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn, AdaLogo, Avatar, AvatarFallback } from "ada-design-system";
import { useAuth } from "../context/AuthContext";

function getInitials(user: {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
}): string {
  if (user.full_name)
    return user.full_name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  if (user.first_name && user.last_name)
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  if (user.first_name) return user.first_name.slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

function getDisplayName(user: {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
}): string {
  if (user.full_name) return user.full_name;
  if (user.first_name && user.last_name)
    return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return user.email.split("@")[0];
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
  active?: boolean;
  variant?: "default" | "danger";
  onClick?: () => void;
}

function NavItem({
  icon,
  label,
  expanded,
  active,
  variant = "default",
  onClick,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg transition-colors",
        expanded ? "px-3 py-2.5" : "justify-center px-0 py-2.5",
        variant === "danger"
          ? "text-destructive hover:bg-destructive/10"
          : active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="w-5 h-5 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      {expanded && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </button>
  );
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { user, logout } = useAuth();

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-background border-r border-border transition-all duration-200 shrink-0",
        expanded ? "w-56" : "w-16",
      )}
    >
      {/* ── Top: Logo ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-border shrink-0",
          expanded ? "px-4 gap-3" : "justify-center",
        )}
      >
        <AdaLogo className="w-7 h-7 shrink-0" />
        {expanded && (
          <span className="font-semibold text-foreground text-sm tracking-tight whitespace-nowrap">
            Menu Builder{" "}
            <span className="text-primary font-bold">AI</span>
          </span>
        )}
      </div>

      {/* ── Toggle button ─────────────────────────────────────────────── */}
      <div className={cn("px-2 pt-3 pb-1", !expanded && "flex justify-center")}>
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {expanded ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-2">
        {/* Profile */}
        <div
          title={!expanded && user ? getDisplayName(user) : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            !expanded && "justify-center px-0",
          )}
        >
          <Avatar className="w-5 h-5 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
              {user ? getInitials(user) : "?"}
            </AvatarFallback>
          </Avatar>
          {expanded && (
            <span className="text-sm font-medium truncate">
              {user ? getDisplayName(user) : "Profile"}
            </span>
          )}
        </div>

        <NavItem
          icon={<BarChart3 className="w-5 h-5" />}
          label="Analytics"
          expanded={expanded}
        />

        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          expanded={expanded}
        />
      </nav>

      {/* ── Bottom: Logout ────────────────────────────────────────────── */}
      <div className="px-2 pb-4">
        <NavItem
          icon={<LogOut className="w-5 h-5" />}
          label="Sign out"
          expanded={expanded}
          variant="danger"
          onClick={logout}
        />
      </div>
    </aside>
  );
}
