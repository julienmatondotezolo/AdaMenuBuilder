import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  Rocket,
  X as XIcon,
  Download,
  Loader2,
  LogOut,
  User,
} from "lucide-react";
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
    <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-gray-200 shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-primary flex items-center justify-center">
            <XIcon className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight">
            MenuBuilder{" "}
            <span className="text-indigo-primary font-bold">AI</span>
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                item === "Editor"
                  ? "text-indigo-primary font-semibold border-b-2 border-indigo-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            className="pl-9 pr-4 py-1.5 w-52 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary/40 placeholder:text-gray-400"
          />
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Eye className="w-4 h-4" />
          Preview
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? "Generating…" : "Download"}
        </button>

        <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-indigo-primary rounded-lg hover:bg-indigo-hover transition-colors">
          <Rocket className="w-4 h-4" />
          Publish
        </button>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-indigo-200 transition-all"
            title={user?.full_name || user?.email || "Account"}
          >
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
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 bg-indigo-50 rounded">
                  {user?.role || "user"}
                </span>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
