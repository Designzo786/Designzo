"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "danger" | "warning" | "info" | "success";

interface AlertAction {
  label: string;
  /** Internal route — renders as <Link>. */
  href?: string;
  /** Click handler — renders as <button>. Ignored if `href` is set. */
  onClick?: () => void;
}

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  /** Body text, or any React node (links, code, etc.) for richer content. */
  children?: ReactNode;
  /** Override the default variant icon. */
  icon?: LucideIcon;
  /** Optional CTA button on the right side. */
  action?: AlertAction;
  /** Show an X close button. Hidden by default. */
  dismissible?: boolean;
  /** Called when the user dismisses; if omitted, the component hides itself. */
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<
  AlertVariant,
  {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    bodyColor: string;
    glow: string;
    defaultIcon: LucideIcon;
  }
> = {
  danger: {
    bg: "bg-danger-muted",
    border: "border-danger/25",
    iconBg: "bg-danger/15",
    iconColor: "text-danger",
    titleColor: "text-danger",
    bodyColor: "text-secondary",
    glow: "shadow-[0_0_32px_-12px_rgba(239,68,68,0.35)]",
    defaultIcon: AlertCircle,
  },
  warning: {
    bg: "bg-gold-muted",
    border: "border-gold/25",
    iconBg: "bg-gold/15",
    iconColor: "text-gold",
    titleColor: "text-gold",
    bodyColor: "text-secondary",
    glow: "shadow-[0_0_32px_-12px_rgba(217,165,32,0.30)]",
    defaultIcon: AlertTriangle,
  },
  info: {
    bg: "bg-info-muted",
    border: "border-info/25",
    iconBg: "bg-info/15",
    iconColor: "text-info",
    titleColor: "text-info",
    bodyColor: "text-secondary",
    glow: "shadow-[0_0_32px_-12px_rgba(56,189,248,0.30)]",
    defaultIcon: Info,
  },
  success: {
    bg: "bg-accent-muted",
    border: "border-accent/25",
    iconBg: "bg-accent/15",
    iconColor: "text-accent-light",
    titleColor: "text-accent-light",
    bodyColor: "text-secondary",
    glow: "shadow-[0_0_32px_-12px_rgba(124,58,237,0.35)]",
    defaultIcon: CheckCircle2,
  },
};

/**
 * Branded alert box for surfacing important state — system errors, warnings,
 * confirmations, info notices. Four severities, optional CTA + dismiss.
 *
 * Examples:
 *
 *   <Alert variant="danger" title="Database unreachable">
 *     We can't load the marketplace right now. Try again in a minute.
 *   </Alert>
 *
 *   <Alert
 *     variant="warning"
 *     title="Pending review"
 *     action={{ label: "Check status", href: "/dashboard" }}
 *   >
 *     Your collaborator application is being reviewed.
 *   </Alert>
 *
 *   <Alert variant="success" dismissible>
 *     Profile saved.
 *   </Alert>
 */
export function Alert({
  variant = "info",
  title,
  children,
  icon: IconOverride,
  action,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const s = VARIANT_STYLES[variant];
  const Icon = IconOverride ?? s.defaultIcon;

  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    else setHidden(true);
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-4 backdrop-blur-sm animate-fade-in",
        s.bg,
        s.border,
        s.glow,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          s.iconBg,
          s.iconColor
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <div className={cn("text-sm font-semibold leading-tight", s.titleColor)}>
            {title}
          </div>
        )}
        {children && (
          <div
            className={cn(
              "text-xs leading-relaxed",
              title && "mt-1",
              s.bodyColor
            )}
          >
            {children}
          </div>
        )}
      </div>

      {action && (
        <div className="shrink-0 self-center">
          {action.href ? (
            <Link
              href={action.href}
              className={cn(
                "inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap",
                s.border,
                s.titleColor,
                "hover:bg-white/5"
              )}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                "inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap",
                s.border,
                s.titleColor,
                "hover:bg-white/5"
              )}
            >
              {action.label}
            </button>
          )}
        </div>
      )}

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={cn(
            "shrink-0 self-start p-1 -mr-1 -mt-1 rounded-md transition-colors",
            s.bodyColor,
            "hover:bg-white/5 hover:text-primary"
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
