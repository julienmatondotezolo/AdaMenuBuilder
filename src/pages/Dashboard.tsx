import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MoreVertical,
  FileText,
  Copy,
  Trash2,
  Pencil,
  LayoutTemplate,
  Store,
  Loader2,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  SkeletonCard,
} from "ada-design-system";
import { useTemplates } from "../db/hooks";
import { useAuth } from "../context/AuthContext";
import { fetchRestaurants, type Restaurant } from "../services/templateApi";
import { fetchMenus, createBackendMenu, deleteBackendMenu, type BackendMenu } from "../services/menuApi";

export default function Dashboard() {
  const templates = useTemplates();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const isAdmin = user?.role === "admin";

  // Restaurant state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  // Menu state
  const [menus, setMenus] = useState<BackendMenu[] | null>(null);
  const [loadingMenus, setLoadingMenus] = useState(false);

  // Dialog state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [createRestaurantId, setCreateRestaurantId] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch restaurants on mount
  useEffect(() => {
    if (!token) return;
    fetchRestaurants(token)
      .then((r) => {
        setRestaurants(r);
        if (r.length > 0) {
          setSelectedRestaurantId(r[0].id);
          setCreateRestaurantId(r[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRestaurants(false));
  }, [token]);

  // Fetch menus when restaurant changes
  const loadMenus = useCallback(async () => {
    if (!token || !selectedRestaurantId) return;
    setLoadingMenus(true);
    try {
      if (isAdmin) {
        // Admin: fetch from all restaurants
        const allMenus: BackendMenu[] = [];
        for (const r of restaurants) {
          const rMenus = await fetchMenus(token, r.id);
          allMenus.push(...rMenus);
        }
        // Sort by updated_at descending
        allMenus.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setMenus(allMenus);
      } else {
        const data = await fetchMenus(token, selectedRestaurantId);
        setMenus(data);
      }
    } catch {
      setMenus([]);
    } finally {
      setLoadingMenus(false);
    }
  }, [token, selectedRestaurantId, isAdmin, restaurants]);

  useEffect(() => {
    if (restaurants.length > 0) loadMenus();
  }, [loadMenus, restaurants]);

  const handleCreateMenu = async () => {
    if (!newTitle.trim() || !token) return;

    const targetRestaurantId = isAdmin ? createRestaurantId : selectedRestaurantId;
    if (!targetRestaurantId) return;

    setCreating(true);
    try {
      const menu = await createBackendMenu(token, targetRestaurantId, {
        title: newTitle.trim(),
        template_id: selectedTemplateId || undefined,
      });
      setShowNewMenu(false);
      setNewTitle("");
      // Reload menus to reflect new one
      await loadMenus();
      navigate(`/menus/${menu.id}/edit?restaurant=${targetRestaurantId}`);
    } catch (err: any) {
      alert(err.message || "Failed to create menu");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (menu: BackendMenu) => {
    setOpenDropdown(null);
    if (!token) return;
    if (!confirm("Delete this menu? This cannot be undone.")) return;
    try {
      await deleteBackendMenu(token, menu.restaurant_id, menu.id);
      await loadMenus();
    } catch (err: any) {
      alert(err.message || "Failed to delete menu");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  const getRestaurantName = (restaurantId: string) => {
    return restaurants.find((r) => r.id === restaurantId)?.name || "";
  };

  if (loadingRestaurants) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">My Menus</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Restaurant filter (non-admin with multiple restaurants) */}
          {!isAdmin && restaurants.length > 1 && (
            <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Store className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("/templates")}>
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button size="sm" onClick={() => {
            setSelectedTemplateId(templates?.[0]?.id || "");
            setCreateRestaurantId(isAdmin ? restaurants[0]?.id || "" : selectedRestaurantId);
            setShowNewMenu(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Menu
          </Button>
        </div>
      </header>

      {/* Create menu dialog */}
      <Dialog open={showNewMenu} onOpenChange={setShowNewMenu}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Menu</DialogTitle>
            <DialogDescription>Give your menu a name and choose a template to start.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="menu-title">Menu Title</Label>
              <Input
                id="menu-title"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Summer Dinner Menu"
                onKeyDown={(e) => e.key === "Enter" && handleCreateMenu()}
              />
            </div>

            {/* Restaurant selector — admin sees all, non-admin with multiple sees their restaurants */}
            {(isAdmin || restaurants.length > 1) && (
              <div className="space-y-2">
                <Label>Restaurant</Label>
                <Select value={createRestaurantId} onValueChange={setCreateRestaurantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.format.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateMenu} disabled={!newTitle.trim() || creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {creating ? "Creating..." : "Create Menu"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewMenu(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loadingMenus || !menus ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : menus.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No menus yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create your first menu to get started</p>
              <Button size="sm" className="mt-6" onClick={() => {
                setSelectedTemplateId(templates?.[0]?.id || "");
                setCreateRestaurantId(isAdmin ? restaurants[0]?.id || "" : selectedRestaurantId);
                setShowNewMenu(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Menu
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                restaurantName={isAdmin ? getRestaurantName(menu.restaurant_id) : undefined}
                isDropdownOpen={openDropdown === menu.id}
                onToggleDropdown={() => setOpenDropdown(openDropdown === menu.id ? null : menu.id)}
                onEdit={() => navigate(`/menus/${menu.id}/edit?restaurant=${menu.restaurant_id}`)}
                onDelete={() => handleDelete(menu)}
                formatDate={formatDate}
              />
            ))}

            {/* New menu card */}
            <Card
              className="cursor-pointer border-2 border-dashed transition-colors hover:border-primary/40"
              onClick={() => {
                setSelectedTemplateId(templates?.[0]?.id || "");
                setCreateRestaurantId(isAdmin ? restaurants[0]?.id || "" : selectedRestaurantId);
                setShowNewMenu(true);
              }}
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <Plus className="w-8 h-8 text-muted-foreground/40" />
                <span className="text-sm font-medium text-muted-foreground">New Menu</span>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Menu Card ───────────────────────────────────────────────────────── */

interface MenuCardProps {
  menu: BackendMenu;
  restaurantName?: string;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (iso: string) => string;
}

function MenuCard({ menu, restaurantName, isDropdownOpen, onToggleDropdown, onEdit, onDelete, formatDate }: MenuCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onEdit}
    >
      {/* Preview area */}
      <div className="h-40 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        {menu.thumbnail ? (
          <>
            {/* Blurred background fill */}
            <img
              src={menu.thumbnail}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(20px)", transform: "scale(1.2)" }}
            />
            {/* Sharp thumbnail centered */}
            <img
              src={menu.thumbnail}
              alt={menu.title}
              className="relative h-full object-contain drop-shadow-lg"
              style={{ maxHeight: "160px" }}
            />
          </>
        ) : (
          <div className="text-center">
            {restaurantName && (
              <p className="text-[8px] tracking-[0.3em] text-primary/60 uppercase font-semibold">
                {restaurantName}
              </p>
            )}
            <p className="text-lg font-light italic text-foreground/70 mt-1">
              {menu.title}
            </p>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground truncate">{menu.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(menu.updated_at)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <Badge variant={menu.status === "published" ? "default" : "secondary"}>
              {menu.status === "published" ? "Published" : "Draft"}
            </Badge>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleDropdown(); }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {isDropdownOpen && (
                <Card className="absolute right-0 top-8 z-50 w-36 py-1 shadow-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <button onClick={onEdit} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
