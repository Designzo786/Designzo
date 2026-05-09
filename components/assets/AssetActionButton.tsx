"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, ShoppingCart, LogIn, Check, Sparkles, Upload } from "lucide-react";

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
}

export function AssetActionButton({ mode, assetId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function go(href: string) {
    setBusy(true);
    router.push(href);
  }

  function downloadNow() {
    // Window navigation kicks off the file download via Content-Disposition
    setBusy(true);
    window.location.href = `/api/assets/${assetId}/download`;
    // Re-enable button shortly after — the navigation triggers a download,
    // not a navigation, so the page stays put.
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
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={downloadNow}
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
    return (
      <button
        type="button"
        onClick={downloadNow}
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
