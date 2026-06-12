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
  Box,
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
  /** Asset's FileType — drives the format chooser for LOTTIE and
   *  MODEL_3D uploads. Everything else downloads as a single file
   *  with no chooser. */
  fileType?: string;
  hasLottieGif?: boolean;
  hasLottieMp4?: boolean;
  hasModelFbx?: boolean;
  hasModelObj?: boolean;
  hasModelUsdz?: boolean;
}

export function AssetActionButton({
  mode,
  assetId,
  fileType,
  hasLottieGif = false,
  hasLottieMp4 = false,
  hasModelFbx = false,
  hasModelObj = false,
  hasModelUsdz = false,
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
    // Multi-format assets get a chooser. Lottie ships a bundle by default
    // + per-format singles. 3D ships the .glb by default + per-format
    // companions (.fbx / .obj / .usdz). Everything else stays a plain
    // single-file download.
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

    if (
      fileType === "MODEL_3D" &&
      (hasModelFbx || hasModelObj || hasModelUsdz)
    ) {
      return (
        <div className="space-y-2">
          <Model3dDownloadButton
            busy={busy}
            onDownload={downloadNow}
            hasFbx={hasModelFbx}
            hasObj={hasModelObj}
            hasUsdz={hasModelUsdz}
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

    if (
      fileType === "MODEL_3D" &&
      (hasModelFbx || hasModelObj || hasModelUsdz)
    ) {
      return (
        <Model3dDownloadButton
          busy={busy}
          onDownload={downloadNow}
          hasFbx={hasModelFbx}
          hasObj={hasModelObj}
          hasUsdz={hasModelUsdz}
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
          className="absolute right-0 top-full mt-2 w-72 popover rounded-xl p-1.5 shadow-lg animate-fade-in z-30"
        >
          {/* Every Lottie format is listed so the buyer sees the full
              menu at a glance. Companion formats the creator didn't
              upload stay visible but disabled with a "Not included"
              caption, so a buyer knows what the creator chose to ship
              rather than wondering whether the menu is broken. */}
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
          <FormatRow
            icon={ImagePlay}
            title="GIF preview"
            subtitle={
              hasGif
                ? "Fallback for email + presentations"
                : "Not included by the creator"
            }
            disabled={!hasGif}
            onClick={() => {
              setOpen(false);
              onDownload("gif");
            }}
          />
          <FormatRow
            icon={Film}
            title="MP4 render"
            subtitle={
              hasMp4
                ? "For social and video tools"
                : "Not included by the creator"
            }
            disabled={!hasMp4}
            onClick={() => {
              setOpen(false);
              onDownload("mp4");
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Split download button for MODEL_3D assets that ship at least one
 * alternate format. The primary left half always downloads the .glb
 * (the file the in-browser viewer renders); the chevron menu lists
 * every format the creator uploaded so the buyer can pick whichever
 * matches their target engine.
 *
 * Unlike Lottie there's no ZIP bundle option — 3D buyers usually want
 * exactly one format, and bundling a 100MB GLB + 30MB FBX + 20MB OBJ
 * is right on the edge of Vercel's response size budget.
 */
function Model3dDownloadButton({
  busy,
  onDownload,
  hasFbx,
  hasObj,
  hasUsdz,
  tone = "accent",
}: {
  busy: boolean;
  onDownload: (format?: string) => void;
  hasFbx: boolean;
  hasObj: boolean;
  hasUsdz: boolean;
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
          {busy ? "Preparing…" : "Download .glb"}
        </button>
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
          className="absolute right-0 top-full mt-2 w-72 popover rounded-xl p-1.5 shadow-lg animate-fade-in z-30"
        >
          {/* All four 3D formats listed. Companion formats the creator
              didn't upload show as disabled rows with a "Not included"
              caption — same pattern as the Lottie chooser. */}
          <FormatRow
            icon={Box}
            title="glTF Binary (.glb)"
            subtitle="Web preview, Three.js, Babylon"
            onClick={() => {
              setOpen(false);
              onDownload("glb");
            }}
          />
          <FormatRow
            icon={Box}
            title="FBX export (.fbx)"
            subtitle={
              hasFbx
                ? "Unity, Unreal, Autodesk pipelines"
                : "Not included by the creator"
            }
            disabled={!hasFbx}
            onClick={() => {
              setOpen(false);
              onDownload("fbx");
            }}
          />
          <FormatRow
            icon={Box}
            title="OBJ export (.obj)"
            subtitle={
              hasObj
                ? "Universal text format, no rig"
                : "Not included by the creator"
            }
            disabled={!hasObj}
            onClick={() => {
              setOpen(false);
              onDownload("obj");
            }}
          />
          <FormatRow
            icon={Box}
            title="USDZ export (.usdz)"
            subtitle={
              hasUsdz
                ? "Apple AR Quick Look / Vision Pro"
                : "Not included by the creator"
            }
            disabled={!hasUsdz}
            onClick={() => {
              setOpen(false);
              onDownload("usdz");
            }}
          />
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
  disabled = false,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  onClick: () => void;
  /** Render the row but block the click. Used for formats the creator
   *  didn't upload — buyer sees the full catalogue and instantly
   *  understands which formats are part of *this* purchase. */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-elevated cursor-pointer"
      )}
    >
      <span
        className={cn(
          "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
          disabled
            ? "bg-elevated/40 border-border/60 text-muted"
            : "bg-elevated border-border text-accent-light"
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            disabled ? "text-secondary" : "text-primary"
          )}
        >
          {title}
          {disabled && (
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted bg-elevated/60 border border-border rounded px-1 py-0.5">
              Unavailable
            </span>
          )}
        </span>
        <span
          className={cn(
            "block text-[11px] truncate",
            disabled ? "text-muted/70" : "text-muted"
          )}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}
