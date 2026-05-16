import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ada-design-system";
import { reassignMenu } from "../services/menuApi";
import { getPublishStatus, unpublishMenu } from "../services/menuPublishApi";
import type { Restaurant } from "../services/templateApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: string;
  menuTitle: string;
  currentRestaurantId: string;
  restaurants: Restaurant[];
  token: string;
  onSuccess: (newRestaurantId: string) => void;
}

export default function ReassignMenuDialog({
  open,
  onOpenChange,
  menuId,
  menuTitle,
  currentRestaurantId,
  restaurants,
  token,
  onSuccess,
}: Props) {
  const [targetId, setTargetId] = useState<string>("");
  const [isPublished, setIsPublished] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTargetId("");
    setError("");
    setIsPublished(null);
    setChecking(true);
    getPublishStatus(token, menuId)
      .then((s) => setIsPublished(s.published))
      .catch(() => setIsPublished(null))
      .finally(() => setChecking(false));
  }, [open, menuId, token]);

  const currentRestaurant = restaurants.find((r) => r.id === currentRestaurantId);
  const candidates = restaurants.filter((r) => r.id !== currentRestaurantId);
  const canSubmit = !!targetId && !submitting && isPublished === false;

  const handleMove = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await reassignMenu(token, menuId, targetId);
      onSuccess(targetId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reassign failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    setUnpublishing(true);
    setError("");
    try {
      await unpublishMenu(token, menuId);
      setIsPublished(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish");
    } finally {
      setUnpublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move menu to a different restaurant</DialogTitle>
          <DialogDescription>
            Reassign <span className="font-medium">{menuTitle}</span> and all its categories + items to another restaurant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase">Current restaurant</Label>
            <div className="text-sm font-medium">{currentRestaurant?.name ?? currentRestaurantId}</div>
          </div>

          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking publish status…
            </div>
          ) : isPublished ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  This menu is currently <strong>published</strong>. Unpublish it before reassigning, otherwise the public QR would silently change which restaurant it belongs to.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnpublish}
                disabled={unpublishing}
                className="bg-white"
              >
                {unpublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {unpublishing ? "Unpublishing…" : "Unpublish menu"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="target-restaurant">Move to</Label>
              <Select value={targetId} onValueChange={setTargetId} disabled={submitting}>
                <SelectTrigger id="target-restaurant">
                  <SelectValue placeholder="Select a restaurant…" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleMove} disabled={!canSubmit}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? "Moving…" : "Move menu"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
