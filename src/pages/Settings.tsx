import { useState, useEffect, type FormEvent } from "react";
import { Settings as SettingsIcon, Loader2, Eye, EyeOff } from "lucide-react";
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
} from "ada-design-system";
import { useAuth } from "../context/AuthContext";
import { useTranslation, type Language } from "../i18n";
import { AUTH_URL } from "../config/auth";

function getInitials(user: { full_name?: string; first_name?: string; last_name?: string; email: string }): string {
  if (user.full_name) {
    return user.full_name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  if (user.first_name && user.last_name) {
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  }
  if (user.first_name) return user.first_name[0].toUpperCase();
  return user.email[0].toUpperCase();
}

function getDisplayName(user: { full_name?: string; first_name?: string; last_name?: string; email: string }): string {
  if (user.full_name) return user.full_name;
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return user.email;
}

export default function Settings() {
  const { user, token } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clear password message after 5 seconds
  useEffect(() => {
    if (!passwordMessage) return;
    const timer = setTimeout(() => setPasswordMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [passwordMessage]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!newPassword.trim()) {
      setPasswordMessage({ type: "error", text: "New password cannot be empty." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/auth/update-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Failed to update password.");
      }

      setPasswordMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">{t("settings.title")}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t("settings.profile")}</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                {getInitials(user)}
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground truncate">
                  {getDisplayName(user)}
                </p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <Badge variant="secondary" className="mt-1.5">
                  {t(`settings.roles.${user.role}`)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t("settings.changePassword")}</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t("settings.currentPassword")}</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("settings.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {passwordMessage && (
                <p
                  className={`text-sm ${
                    passwordMessage.type === "success" ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {passwordMessage.text}
                </p>
              )}

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {passwordLoading ? t("settings.updating") : t("settings.updatePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t("settings.language")}</h2>
            <div className="space-y-3">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder={t("settings.selectLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("settings.english")}</SelectItem>
                  <SelectItem value="fr">{t("settings.french")}</SelectItem>
                  <SelectItem value="nl">{t("settings.dutch")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("settings.aiLanguageNote")}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
