import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  Star,
  UserCheck,
  UserX,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";

/**
 * Per-type visual treatment (icon + accent color). Shared between the navbar
 * bell dropdown and the full-history page so both render identically.
 *
 * `label` is the human-readable group name used in filter chips.
 */
// Built as `Partial<Record<...>>` while the Prisma client may lag behind the
// schema (the WELCOME enum value was added by migration but a running dev
// server can prevent `prisma generate` from refreshing TS types). The
// `getNotificationStyle()` lookup below falls back to a generic style for
// any type not present here, so this is always safe at runtime.
export const NOTIFICATION_TYPE_STYLE: Partial<
  Record<NotificationType | "WELCOME", { icon: LucideIcon; className: string; label: string }>
> = {
  ASSET_APPROVED: {
    icon: CheckCircle2,
    className: "text-accent-light",
    label: "Asset approved",
  },
  ASSET_REJECTED: {
    icon: XCircle,
    className: "text-danger",
    label: "Asset rejected",
  },
  SALE: { icon: DollarSign, className: "text-gold", label: "Sale" },
  PURCHASE: {
    icon: ShoppingBag,
    className: "text-accent-light",
    label: "Purchase",
  },
  PAYOUT_PROCESSING: {
    icon: Clock,
    className: "text-info",
    label: "Payout processing",
  },
  PAYOUT_PAID: {
    icon: CheckCircle2,
    className: "text-accent-light",
    label: "Payout paid",
  },
  PAYOUT_FAILED: {
    icon: XCircle,
    className: "text-danger",
    label: "Payout failed",
  },
  KYC_VERIFIED: {
    icon: ShieldCheck,
    className: "text-accent-light",
    label: "KYC verified",
  },
  KYC_REJECTED: {
    icon: ShieldAlert,
    className: "text-danger",
    label: "KYC rejected",
  },
  CREATOR_APPROVED: {
    icon: UserCheck,
    className: "text-accent-light",
    label: "Collaborator approved",
  },
  CREATOR_REJECTED: {
    icon: UserX,
    className: "text-danger",
    label: "Collaborator rejected",
  },
  REVIEW: { icon: Star, className: "text-gold", label: "Review" },
  WELCOME: {
    icon: PartyPopper,
    className: "text-accent-light",
    label: "Welcome",
  },
};

export const FALLBACK_STYLE = {
  icon: Bell,
  className: "text-muted",
  label: "Notification",
} as const;

export function getNotificationStyle(type: string) {
  return (
    NOTIFICATION_TYPE_STYLE[
      type as NotificationType | "WELCOME"
    ] ?? FALLBACK_STYLE
  );
}
