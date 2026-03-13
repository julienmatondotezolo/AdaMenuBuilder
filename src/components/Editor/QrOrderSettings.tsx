import { Input, Label, Switch } from "ada-design-system";
import { ShoppingCart, UtensilsCrossed, Truck } from "lucide-react";
import type { QrOrderConfig } from "../../types/template";

interface Props {
  config: QrOrderConfig;
  onChange: (config: QrOrderConfig) => void;
}

const ORDER_MODES = [
  { key: "takeaway" as const, label: "Takeaway", description: "Customer picks up the order", icon: ShoppingCart },
  { key: "send-to-kds" as const, label: "Send to KDS", description: "Order goes to Kitchen Display", icon: UtensilsCrossed },
  { key: "delivery" as const, label: "Delivery", description: "Order delivered to customer", icon: Truck },
] as const;

export default function QrOrderSettings({ config, onChange }: Props) {
  const update = (partial: Partial<QrOrderConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">Enable Ordering</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">Let customers add items to cart</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => update({ enabled })}
        />
      </div>

      {config.enabled && (
        <>
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Order Modes</Label>
            {ORDER_MODES.map(({ key, label, description, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 py-1.5">
                <div className="w-7 h-7 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium">{label}</span>
                  <p className="text-[9px] text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={config.modes[key]}
                  onCheckedChange={(v) =>
                    update({ modes: { ...config.modes, [key]: v } })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Display</Label>
            <div className="space-y-1">
              <Label className="text-[10px]">Currency Symbol</Label>
              <Input
                className="h-7 text-xs w-20"
                value={config.currency}
                onChange={(e) => update({ currency: e.target.value })}
                maxLength={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Show Item Images</Label>
              <Switch
                checked={config.showItemImages}
                onCheckedChange={(v) => update({ showItemImages: v })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
