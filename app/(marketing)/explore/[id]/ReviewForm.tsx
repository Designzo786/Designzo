"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { cn } from "@/lib/utils";

interface Props {
  assetId: string;
  initialRating: number; // 0 when the user hasn't reviewed yet
  initialComment: string;
}

export function ReviewForm({ assetId, initialRating, initialComment }: Props) {
  const router = useRouter();
  const hasExisting = initialRating > 0;

  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/assets/${assetId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not post your review.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove your review?")) return;
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/assets/${assetId}/reviews`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not remove your review.");
      setBusy(false);
      return;
    }
    setRating(0);
    setComment("");
    setBusy(false);
    router.refresh();
  }

  const shown = hover || rating;

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-elevated/50 p-4 space-y-3"
    >
      <div className="text-sm font-medium text-primary">
        {hasExisting ? "Your review" : "Write a review"}
      </div>

      {/* Star picker */}
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                n <= shown
                  ? "fill-gold text-gold"
                  : "text-muted"
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-xs text-muted">{rating}/5</span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Share what you think of this asset… (optional)"
        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all resize-y"
      />

      <FormError message={error} />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy} className="h-9 text-xs">
          {busy
            ? "Saving…"
            : hasExisting
              ? "Update review"
              : "Post review"}
        </Button>
        {hasExisting && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium text-muted hover:text-danger hover:bg-danger-muted transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
    </form>
  );
}
