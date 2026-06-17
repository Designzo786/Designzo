"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "danger" | "warning" | "info";

interface BaseOptions {
  variant?: ConfirmVariant;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
}

export type ConfirmOptions = BaseOptions;

export interface PromptOptions extends BaseOptions {
  placeholder?: string;
  /** Pre-fill the input. */
  defaultValue?: string;
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean;
  /** If true (default), confirm is disabled until the user types something. */
  required?: boolean;
}

type DialogMode = "confirm" | "prompt";

interface DialogState extends BaseOptions {
  open: boolean;
  mode: DialogMode;
  // prompt-only fields
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  required?: boolean;
  /** Resolves confirm() to bool or prompt() to string|null. */
  resolve?: (value: boolean | string | null) => void;
}

const VARIANT_STYLES: Record<
  ConfirmVariant,
  {
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    iconGlow: string;
    confirmBtn: string;
    defaultIcon: LucideIcon;
    edgeGlow: string;
    inputRing: string;
  }
> = {
  danger: {
    iconBg: "bg-gradient-to-br from-danger/30 to-danger/5",
    iconBorder: "border-danger/40",
    iconColor: "text-danger",
    iconGlow: "shadow-[0_0_32px_-6px_rgba(239,68,68,0.55)]",
    confirmBtn:
      "bg-danger text-white hover:bg-danger/90 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.6)]",
    defaultIcon: AlertTriangle,
    edgeGlow:
      "shadow-[0_30px_80px_-20px_rgba(239,68,68,0.35),0_0_0_1px_rgba(239,68,68,0.12)_inset]",
    inputRing: "focus:border-danger focus:ring-danger/30",
  },
  warning: {
    iconBg: "bg-gradient-to-br from-gold/30 to-gold/5",
    iconBorder: "border-gold/40",
    iconColor: "text-gold",
    iconGlow: "shadow-[0_0_32px_-6px_rgba(217,165,32,0.50)]",
    confirmBtn:
      "bg-gold text-canvas hover:bg-gold/90 shadow-[0_8px_24px_-8px_rgba(217,165,32,0.5)]",
    defaultIcon: AlertCircle,
    edgeGlow:
      "shadow-[0_30px_80px_-20px_rgba(217,165,32,0.30),0_0_0_1px_rgba(217,165,32,0.12)_inset]",
    inputRing: "focus:border-gold focus:ring-gold/30",
  },
  info: {
    iconBg: "bg-gradient-to-br from-accent/30 to-accent/5",
    iconBorder: "border-accent/40",
    iconColor: "text-accent-light",
    iconGlow: "shadow-[0_0_32px_-6px_rgba(124,58,237,0.55)]",
    confirmBtn:
      "bg-accent text-white hover:bg-accent/90 shadow-[0_8px_24px_-8px_rgba(124,58,237,0.6)]",
    defaultIcon: Info,
    edgeGlow:
      "shadow-[0_30px_80px_-20px_rgba(124,58,237,0.40),0_0_0_1px_rgba(124,58,237,0.15)_inset]",
    inputRing: "focus:border-accent focus:ring-accent/30",
  },
};

/**
 * Branded modal with imperative API for both Yes/No confirms AND text-input
 * prompts. One render of `dialog` powers both call sites.
 *
 *   const { confirm, prompt, dialog } = useDialog();
 *
 *   const ok   = await confirm({ variant: "danger", title: "Delete?", ... });
 *   const note = await prompt ({ variant: "danger", title: "Why reject?", placeholder: "Reason…" });
 *
 *   return (<>{button}{dialog}</>);
 *
 * `confirm` resolves to boolean (true = confirmed). `prompt` resolves to the
 * trimmed string, or null if the user cancelled.
 */
export function useDialog() {
  const [state, setState] = useState<DialogState>({
    open: false,
    title: "",
    mode: "confirm",
  });
  const resolverRef = useRef<DialogState["resolve"]>(undefined);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve as DialogState["resolve"];
      setState({ ...opts, open: true, mode: "confirm" });
    });
  }, []);

  const prompt = useCallback(
    (opts: PromptOptions): Promise<string | null> => {
      return new Promise<string | null>((resolve) => {
        resolverRef.current = resolve as DialogState["resolve"];
        setState({
          ...opts,
          required: opts.required ?? true,
          open: true,
          mode: "prompt",
        });
      });
    },
    []
  );

  const respond = useCallback((value: boolean | string | null) => {
    const r = resolverRef.current;
    resolverRef.current = undefined;
    setState((s) => ({ ...s, open: false }));
    if (r) r(value);
  }, []);

  const dialog = (
    <Dialog
      {...state}
      onConfirm={(v?: string) =>
        respond(state.mode === "prompt" ? (v ?? null) : true)
      }
      onCancel={() => respond(state.mode === "prompt" ? null : false)}
    />
  );

  return { confirm, prompt, dialog };
}

/** Convenience alias matching the original useConfirm shape — for sites that
 *  only need boolean confirmation. */
export function useConfirm() {
  const { confirm, dialog } = useDialog();
  return { confirm, dialog };
}

interface DialogProps extends BaseOptions {
  open: boolean;
  mode: DialogMode;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  required?: boolean;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

function Dialog({
  open,
  mode,
  variant = "info",
  title,
  body,
  confirmLabel = mode === "prompt" ? "Submit" : "Confirm",
  cancelLabel = "Cancel",
  icon: IconOverride,
  placeholder,
  defaultValue,
  multiline,
  required = true,
  onConfirm,
  onCancel,
}: DialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("");

  // Mount flag — only render the portal once we're on the client.
  // The cascading render is one-time and intentional (gates createPortal
  // until document.body exists).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Reset/seed input value whenever the dialog opens. Without this, repeated
  // prompts inside the same component would keep the prior typed value.
  // Effect is driven by the `open` external signal — setText IS the intended
  // synchronisation, not a cascading render bug.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setText(defaultValue ?? "");
  }, [open, defaultValue]);

  // Esc to cancel; lock body scroll while open. Focus management favors safe
  // defaults: prompts focus the input; destructive confirms focus Cancel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      if (mode === "prompt") inputRef.current?.focus();
      else cancelBtnRef.current?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, mode, onCancel]);

  if (!mounted || !open) return null;

  const s = VARIANT_STYLES[variant];
  const Icon = IconOverride ?? s.defaultIcon;
  const trimmed = text.trim();
  const canConfirm = mode === "confirm" || !required || trimmed.length > 0;

  function submit() {
    if (mode === "prompt") onConfirm(trimmed);
    else onConfirm();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
    >
      {/* Backdrop — blurred + dimmed; click to cancel */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in cursor-default"
      />

      {/* Dialog card */}
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-surface border border-border p-6",
          "animate-[scale-in_0.18s_ease-out]",
          s.edgeGlow
        )}
        onKeyDown={(e) => {
          // Submit on Enter (except in multiline textarea — Shift+Enter is
          // newline there anyway, plain Enter we still submit unless the
          // textarea is focused and the user wants a newline).
          if (e.key === "Enter" && !e.shiftKey) {
            if (mode === "confirm") {
              e.preventDefault();
              if (canConfirm) submit();
            } else if (!multiline) {
              e.preventDefault();
              if (canConfirm) submit();
            }
          }
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted hover:text-primary hover:bg-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={cn(
            "w-14 h-14 rounded-2xl border flex items-center justify-center mb-5",
            s.iconBg,
            s.iconBorder,
            s.iconColor,
            s.iconGlow
          )}
        >
          <Icon className="w-6 h-6" strokeWidth={2.2} />
        </div>

        <h2
          id="confirm-title"
          className="text-lg font-semibold text-primary leading-tight"
        >
          {title}
        </h2>
        {body && (
          <div className="mt-2 text-sm text-secondary leading-relaxed whitespace-pre-line">
            {body}
          </div>
        )}

        {mode === "prompt" && (
          <div className="mt-4">
            {multiline ? (
              <textarea
                ref={(el) => {
                  inputRef.current = el;
                }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-primary placeholder:text-muted",
                  "transition-colors outline-none ring-0 focus:ring-2",
                  s.inputRing
                )}
              />
            ) : (
              <input
                ref={(el) => {
                  inputRef.current = el;
                }}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg bg-input border border-border text-sm text-primary placeholder:text-muted",
                  "transition-colors outline-none ring-0 focus:ring-2",
                  s.inputRing
                )}
              />
            )}
            {required && trimmed.length === 0 && (
              <p className="mt-1.5 text-[11px] text-muted">Required</p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-elevated border border-border hover:border-border-hover transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canConfirm}
            className={cn(
              "inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              s.confirmBtn,
              !canConfirm && "opacity-50 cursor-not-allowed"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
