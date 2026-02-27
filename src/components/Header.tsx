import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  Rocket,
  Download,
  Loader2,
  LogOut,
  User,
} from "lucide-react";
import { 
  Button, 
  AdaLogo, 
  Avatar, 
  AvatarFallback, 
  Badge, 
  Input, 
  cn 
} from "ada-design-system";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";
const navItems = ["Editor", "Menus", "Library", "Settings"] as const;

export default function Header() {
  const { menuData, orientation, columnCount, layoutDirection } = useMenu();
  const { user, logout } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
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
    <header className="h-14 flex items-center justify-between px-4 bg-background border-b border-border shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <AdaLogo className="w-8 h-8" />
          <span className="font-semibold text-foreground text-sm tracking-tight">
            MenuBuilder{" "}
            <span className="text-primary font-bold">AI</span>
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item}
              variant={item === "Editor" ? "default" : "ghost"}
              size="sm"
              className={cn(
                item === "Editor" && "border-b-2 border-primary rounded-b-none"
              )}
            >
              {item}
            </Button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search menu items..."
            className="pl-9 w-52"
          />
        </div>

        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4" />
          Preview
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? "Generating…" : "Download"}
        </Button>

        <Button size="sm">
          <Rocket className="w-4 h-4" />
          Publish
        </Button>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userMenuRef}>
          <Avatar
            className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={user?.full_name || user?.email || "Account"}
          >
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-bold">
              {user?.full_name ? (
                user.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              ) : (
                <User className="w-4 h-4" />
              )}
            </AvatarFallback>
          </Avatar>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium text-card-foreground truncate">
                  {user?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <Badge variant="secondary" className="mt-1">
                  {user?.role || "user"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
