import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  Download,
  Rocket,
  Loader2,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button, AdaLogo, Avatar, AvatarFallback } from "ada-design-system";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";

function getInitials(user: { full_name?: string; first_name?: string; last_name?: string; email: string }): string {
  if (user.full_name) {
    return user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  if (user.first_name && user.last_name) {
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  }
  if (user.first_name) return user.first_name.slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

export default function Header() {
  const { menuData, orientation, columnCount, layoutDirection } = useMenu();
  const { user, logout } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMenuPdf(
        menuData.restaurantName,
        menuData,
        orientation,
        columnCount,
        layoutDirection,
      );
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="h-14 flex items-center px-4 bg-background border-b border-border shrink-0 z-20">
      {/* LEFT — Logo + Editing label */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <AdaLogo className="w-7 h-7" />
          <span className="font-semibold text-foreground text-sm tracking-tight whitespace-nowrap">
            Menu Builder{" "}
            <span className="text-primary font-bold">AI</span>
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Menu name dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 text-sm hover:bg-muted/50 rounded-md px-2 py-1 transition-colors min-w-0"
          >
            <span className="text-muted-foreground shrink-0">Editing:</span>
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {menuData.title || "Untitled Menu"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent menus
              </div>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors font-medium text-foreground">
                {menuData.title || "Untitled Menu"}
              </button>
              <div className="border-t border-border my-1" />
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-muted-foreground">
                + New menu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER — Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="flex items-center gap-2 w-full max-w-sm h-9 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:border-input">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search menu items..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* RIGHT — Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? "Generating…" : "Download"}
        </Button>

        <Button size="sm" className="flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          Publish
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-2" />

        {/* Profile avatar */}
        <div className="relative z-[100]" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="w-9 h-9 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user ? getInitials(user) : "?"}
              </AvatarFallback>
            </Avatar>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-lg shadow-xl border border-border py-2 z-[999]">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {user ? getInitials(user) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.full_name || user?.first_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    // TODO: navigate to profile
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  My Profile
                </button>

                <div className="border-t border-border my-1" />

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
