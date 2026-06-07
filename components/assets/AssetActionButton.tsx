"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Download,
  ShoppingCart,
  LogIn,
  Check,
  Sparkles,
  Upload,
  Package,
  FileJson,
  ImagePlay,
  Film,
  ChevronDown,
} from "lucide-react";
import { useDropdown } from "@/hooks/useDropdown";
import { cn } from "@/lib/utils";

type Mode =
  | "demo" // Mock data, signed-out — push to register
  | "demo-signed-in" // Mock data, signed in — push to upload-your-own
  | "guest-buy" // Real paid asset, user not signed in → push to login
  | "guest-free" // Real free asset, user not signed in → push to login
  | "owned" // User uploaded this asset OR purchased it OR is admin
  | "free" // Real free asset, signed in, not yet downloaded
  | "buy"; // Real paid asset, signed in, not yet purchased

interface Props {
  mode: Mode;
  assetId: string;
  /** Asset's FileType — currently only used to enable the format
   *  chooser for LOTTIE uploads. Everything else downloads as a
   *  single file with no chooser. */
  fileType?: string;
  /** True when the Lottie asset shipped a GIF companion. */
  hasLottieGif?: boolean;
  /** True when the Lottie asset shipped an MP4 companion. */
  hasLottieMp4?: boolean;
}

export function AssetActionButton({
  mode,
  assetId,
  fileType,
  hasLottieGif = false,
  hasLottieMp4 = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function go(href: string) {
    setBusy(true);
    router.push(href);
  }

  // Window navigation kicks off the file download via Content-Disposition.
  // Optional `format` query param picks a single Lottie format instead of
  // the default ZIP bundle.
  function downloadNow(format?: string) {
    setBusy(true);
    const qs = format ? `?format=${encodeURIComponent(format)}` : "";
    window.location.href = `/api/assets/${assetId}/download${qs}`;
    setTimeout(() => setBusy(false), 1500);
  }

  const base =
    "w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:pointer-events-none";

  if (mode === "demo") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => go("/register")}
          className={`${base} bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)]`}
        >
          <Sparkles className="w-5 h-5" />
          Sign up to download
        </button>
        <p className="text-xs text-muted text-center">
          This is a sample asset. Register to upload your own and download
          real assets from creators.
        </p>
      </div>
    );
  }

  if (mode === "demo-signed-in") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => go("/dashboard/uploads/new")}
          disabled={busy}
          className={`${base} bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)]`}
        >
          <Upload className="w-5 h-5" />
          Upload your own asset
        </button>
        <p className="text-xs text-muted text-center">
          Sample assets aren&apos;t available for download. Upload your own
          asset to share with the marketplace.
        </p>
      </div>
    );
  }

  if (mode === "guest-free" || mode === "guest-buy") {
    const target = `/login?callbackUrl=/explore/${assetId}`;
    return (
      <button
        type="button"
        onClick={() => go(target)}
        disabled={busy}
        className={`${base} bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)]`}
      >
        <LogIn className="w-5 h-5" />
        {mode === "guest-free" ? "Sign in to download" : "Sign in to buy"}
      </button>
    );
  }

  if (mode === "owned") {
    // Lottie assets get a format chooser since the bundle may contain
    // multiple deliverables (JSON source + optional GIF + optional MP4
    // + LICENSE + README). Non-Lottie assets show the standard single
    // download button.
    if (fileType === "LOTTIE") {
      return (
        <div className="space-y-2">
          <LottieDownloadButton
            busy={busy}
            onDownload={downloadNow}
            hasGif={hasLottieGif}
            hasMp4={hasLottieMp4}
          />
          <p className="inline-flex items-center gap-1.5 text-xs text-info justify-center w-full">
            <Check className="w-3.5 h-3.5" /> You own this asset
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => downloadNow()}
          disabled={busy}
          className={`${base} bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)]`}
        >
          <Download className="w-5 h-5" />
          {busy ? "Preparing…" : "Download"}
        </button>
        <p className="inline-flex items-center gap-1.5 text-xs text-info justify-center w-full">
          <Check className="w-3.5 h-3.5" /> You own this asset
        </p>
      </div>
    );
  }

  if (mode === "free") {
    if (fileType === "LOTTIE") {
      return (
        <LottieDownloadButton
          busy={busy}
          onDownload={downloadNow}
          hasGif={hasLottieGif}
          hasMp4={hasLottieMp4}
          tone="info"
        />
      );
    }

    return (
      <button
        type="button"
        onClick={() => downloadNow()}
        disabled={busy}
        className={`${base} bg-gradient-to-r from-info to-blue-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:shadow-[0_0_32px_rgba(59,130,246,0.5)]`}
      >
        <Download className="w-5 h-5" />
        {busy ? "Preparing…" : "Download free"}
      </button>
    );
  }

  // mode === "buy"
  return (
    <button
      type="button"
      onClick={() => go(`/checkout/${assetId}`)}
      disabled={busy}
      className={`${base} bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)]`}
    >
      <ShoppingCart className="w-5 h-5" />
      Buy now
    </button>
  );
}

/**
 * Split download button for Lottie assets.
 *
 * Left half is the primary call to action — downloads the full ZIP bundle
 * (every format the creator uploaded plus LICENSE.txt + README.txt). Right
 * half is a chevron that opens a small menu of single-format choices
 * (Lottie source, GIF if present, MP4 if present). Each menu item directly
 * downloads its file with no extra confirmation.
 */
function LottieDownloadButton({
  busy,
  onDownload,
  hasGif,
  hasMp4,
  tone = "accent",
}: {
  busy: boolean;
  onDownload: (format?: string) => void;
  hasGif: boolean;
  hasMp4: boolean;
  tone?: "accent" | "info";
}) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  const primaryClass =
    tone === "info"
      ? "bg-gradient-to-r from-info to-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:shadow-[0_0_32px_rgba(59,130,246,0.5)]"
      : "bg-gradient-to-r from-accent to-accent-light shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:shadow-[0_0_32px_rgba(124,58,237,0.6)]";

  return (
    <div ref={ref} className="relative">
      <div className="flex w-full rounded-xl overflow-hidden shadow-[0_0_24px_rgba(124,58,237,0.4)]">
        {/* Primary — full bundle */}
        <button
          type="button"
          onClick={() => onDownload()}
          disabled={busy}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold text-white transition-all disabled:opacity-60 disabled:pointer-events-none",
            primaryClass
          )}
        >
          <Download className="w-5 h-5" />
          {busy ? "Preparing…" : "Download bundle"}
        </button>
        {/* Format-chooser trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          aria-label="Choose download format"
          aria-haspopup="menu"
          aria-expanded={open ? "true" : "false"}
          className={cn(
            "px-3 border-l border-white/15 text-white font-semibold transition-all disabled:opacity-60 disabled:pointer-events-none",
            primaryClass
          )}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 popover rounded-xl p-1.5 shadow-lg animate-fade-in z-30"
        >
          <FormatRow
            icon={Package}
            title="All formats (.zip)"
            subtitle="Bundle with LICENSE + README"
            onClick={() => {
              setOpen(false);
              onDownload("zip");
            }}
          />
          <FormatRow
            icon={FileJson}
            title="Lottie source (.json)"
            subtitle="For lottie-web, dotLottie, React"
            onClick={() => {
              setOpen(false);
              onDownload("json");
            }}
          />
          {hasGif && (
            <FormatRow
              icon={ImagePlay}
              title="GIF preview"
              subtitle="Fallback for email + presentations"
              onClick={() => {
                setOpen(false);
                onDownload("gif");
              }}
            />
          )}
          {hasMp4 && (
            <FormatRow
              icon={Film}
              title="MP4 render"
              subtitle="For social and video tools"
              onClick={() => {
                setOpen(false);
                onDownload("mp4");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FormatRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-elevated transition-colors"
    >
      <span className="w-8 h-8 rounded-lg bg-elevated border border-border text-accent-light flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-primary">{title}</span>
        <span className="block text-[11px] text-muted truncate">
          {subtitle}
        </span>
      </span>
    </button>
  );
}
