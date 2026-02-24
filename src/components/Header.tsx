import { useState } from "react";
import { Search, Eye, Rocket, X as XIcon, Download, Loader2 } from "lucide-react";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";
const navItems = ["Editor", "Menus", "Library", "Settings"] as const;

export default function Header() {
  const { menuData, paperFormat, orientation } = useMenu();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMenuPdf(menuData.restaurantName, paperFormat, menuData.categories, orientation);
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

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-2 border-white shadow-sm" />
      </div>
    </header>
  );
}
