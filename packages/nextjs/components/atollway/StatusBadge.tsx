import { Badge } from "~~/components/ui/badge";
import { cn } from "~~/lib/utils";
import { INVESTOR_STATUS } from "~~/utils/atollway/contracts";

type Status = (typeof INVESTOR_STATUS)[number];

const STYLES: Record<Status, { label: string; className: string }> = {
  None: { label: "Not approved", className: "border-border bg-muted text-muted-foreground" },
  Approved: { label: "Approved", className: "border-success/30 bg-success/10 text-success" },
  Frozen: { label: "Frozen", className: "border-warning/30 bg-warning/10 text-warning" },
  Revoked: { label: "Revoked", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

/**
 * An investor's status, as the hub or a spoke records it.
 */
export const StatusBadge = ({ status, className }: { status: Status | undefined; className?: string }) => {
  if (!status) return null;
  const { label, className: tone } = STYLES[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", tone, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
};
