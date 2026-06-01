"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart, Share2, Check, Link as LinkIcon } from "lucide-react";

interface Props {
  assetId: string;
  assetTitle: string;
  initialLiked: boolean;
  isAuthed: boolean;
  /**
   * For mock/demo assets we still want the buttons visible (to avoid a UI
   * regression) but the like API only works for real DB assets. If `false`,
   * the Save button just nudges the user to register/upload like other CTAs.
   */
  isReal: boolean;
}

type ShareState = "idle" | "copied" | "shared" | "error";

export function AssetSocialButtons({
  assetId,
  assetTitle,
  initialLiked,
  isAuthed,
  isReal,
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [pending, startTransition] = useTransition();
  const [shareState, setShareState] = useState<ShareState>("idle");

  async function toggleLike() {
    if (!isAuthed) {
      router.push(`/login?callbackUrl=/explore/${assetId}`);
      return;
    }
    if (!isReal) {
      // Demo asset — guide them toward signup/upload instead
      router.push("/dashboard/uploads/new");
      return;
    }

    // Optimistic flip
    const next = !liked;
    setLiked(next);

    try {
      const res = await fetch(`/api/assets/${assetId}/like`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh the wishlist count etc. on whatever pages are nearby
      startTransition(() => router.refresh());
    } catch {
      // Roll back on failure
      setLiked(!next);
    }
  }

  async function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/explore/${assetId}`
        : `/explore/${assetId}`;
    const shareData = {
      title: assetTitle,
      text: `Check out "${assetTitle}" on Designzo`,
      url,
    };

    // Prefer native share sheet (mobile, some desktop browsers)
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share(shareData);
        setShareState("shared");
        setTimeout(() => setShareState("idle"), 1500);
        return;
      } catch (err) {
        // User cancelled — silently fall back to clipboard
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1800);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 1800);
    }
  }

  const baseBtn =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-60 disabled:pointer-events-none";

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={toggleLike}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        className={
          liked
            ? `${baseBtn} border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15`
            : `${baseBtn} border-border text-secondary hover:text-primary hover:bg-elevated`
        }
      >
        <Heart
          className={`w-4 h-4 ${liked ? "fill-rose-400 text-rose-400" : ""}`}
        />
        {liked ? "Saved" : "Save"}
      </button>

      <button
        type="button"
        onClick={share}
        aria-label="Share asset"
        className={
          shareState === "copied" || shareState === "shared"
            ? `${baseBtn} border-info/40 bg-info-muted text-info`
            : shareState === "error"
              ? `${baseBtn} border-rose-500/40 bg-rose-500/10 text-rose-400`
              : `${baseBtn} border-border text-secondary hover:text-primary hover:bg-elevated`
        }
      >
        {shareState === "copied" ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : shareState === "shared" ? (
          <>
            <Check className="w-4 h-4" />
            Shared
          </>
        ) : shareState === "error" ? (
          <>
            <LinkIcon className="w-4 h-4" />
            Try again
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            Share
          </>
        )}
      </button>
    </div>
  );
}
