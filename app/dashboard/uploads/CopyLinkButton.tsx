"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/**
 * One-click "copy public listing URL to clipboard" button. Sits in the
 * My Assets actions toolkit alongside Open / Edit / Re-download / Delete.
 *
 * Why this over a Share menu: creators most often want to drop the link
 * into a tweet / DM / Discord — clipboard is the fast path. A full share
 * sheet adds friction for a power user who already has their target app
 * open in another tab.
 *
 * Visual feedback: the link-icon flips to a green check for 1.5s on
 * success so the creator knows the copy landed. Falls back to the
 * legacy execCommand path on the rare browser that blocks
 * navigator.clipboard (mostly older mobile Safari).
 */
export function CopyLinkButton({
  assetId,
  title,
}: {
  assetId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const url = `${window.location.origin}/explore/${assetId}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for environments without the Clipboard API. Off-screen
        // textarea + execCommand is the universally-supported path.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail — the row already has an "Open" button as a manual
      // alternative if clipboard is locked down (e.g. cross-origin iframe).
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? "Link copied!" : "Copy public link"}
      aria-label={`Copy link to ${title}`}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
        copied
          ? "text-emerald-300 bg-emerald-500/15 border-emerald-400/40"
          : "text-muted hover:text-accent-light hover:bg-elevated border-border hover:border-accent/40"
      }`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Link2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
