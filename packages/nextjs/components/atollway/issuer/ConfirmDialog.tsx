"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~~/components/ui/alert-dialog";
import { Button } from "~~/components/ui/button";
import { Spinner } from "~~/components/ui/spinner";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** Shown in a box under the description, for example the bridge fee. */
  details?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
};

/**
 * Asks the issuer to confirm an action before the wallet opens, with what it does and what it costs.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel,
  destructive,
  busy,
  onConfirm,
}: ConfirmDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {details && <div className="rounded-lg border bg-muted/40 p-3 text-sm">{details}</div>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <Button variant={destructive ? "destructive" : "default"} disabled={busy} onClick={onConfirm}>
          {busy && <Spinner />}
          {busy ? "Confirm in your wallet" : confirmLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
