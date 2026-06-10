"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CATEGORIES, subcategoriesFor } from "@/lib/mock/assets";
import type { AssetStatus } from "@prisma/client";

interface EditAssetFormProps {
  asset: {
    id: string;
    title: string;
    description: string;
    category: string;
    subcategory: string | null;
    price: number; // paise
    tags: string[];
    status: AssetStatus;
    rejectionNote: string | null;
  };
}

const PRICE_PRESETS = [
  { label: "Free", value: "0" },
  { label: "₹99", value: "99" },
  { label: "₹249", value: "249" },
  { label: "₹499", value: "499" },
] as const;

const MAX_TAGS = 10;

const TAG_SUGGESTIONS: Record<string, string[]> = {
  "3d-models": [
    "low-poly",
    "stylized",
    "realistic",
    "character",
    "weapon",
    "vehicle",
    "prop",
    "rigged",
    "game-ready",
    "pbr",
  ],
  "3d-icons": [
    "ui",
    "icon-set",
    "isometric",
    "rounded",
    "minimal",
    "glossy",
    "outline",
    "color",
    "neon",
    "gradient",
  ],
  lottie: [
    "loader",
    "spinner",
    "success",
    "error",
    "onboarding",
    "celebration",
    "icon-animation",
    "logo",
    "transition",
    "ui",
  ],
  "svg-icons": [
    "outline",
    "filled",
    "duotone",
    "stroked",
    "thin",
    "bold",
    "ui",
    "minimal",
    "rounded",
    "social",
  ],
};

export function EditAssetForm({ asset }: EditAssetFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description);
  const [category, setCategory] = useState(asset.category);
  const [subcategory, setSubcategory] = useState(asset.subcategory ?? "");
  // Price is stored as paise on the wire and shown to the user in ₹.
  const [priceInr, setPriceInr] = useState(String(Math.round(asset.price / 100)));
  const [tags, setTags] = useState<string[]>(asset.tags);
  const [tagDraft, setTagDraft] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subcategoryOptions = subcategoriesFor(category);

  function onCategoryChange(next: string) {
    setCategory(next);
    // Stale subcategory from the previous category would fail server
    // validation — clear it so the creator re-picks for the new category.
    setSubcategory("");
  }

  function commitTag(raw: string) {
    const next = raw.trim().toLowerCase();
    if (next.length < 2 || next.length > 30) return;
    if (tags.includes(next)) return;
    if (tags.length >= MAX_TAGS) return;
    setTags([...tags, next]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (tagDraft.trim()) {
        e.preventDefault();
        commitTag(tagDraft);
      }
    } else if (e.key === "Backspace" && tagDraft === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const tagSet = new Set(tags);
  const suggestions = (TAG_SUGGESTIONS[category] ?? []).filter(
    (s) => !tagSet.has(s)
  );

  const activePreset = PRICE_PRESETS.find((p) => p.value === priceInr);
  const isCustomPrice = !activePreset;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceInrNum = Number(priceInr);
    if (!Number.isFinite(priceInrNum) || priceInrNum < 0) {
      return setError("Price must be 0 or higher.");
    }
    if (priceInrNum > 0 && priceInrNum < 1) {
      return setError("Price must be either 0 (free) or at least ₹1.");
    }
    const priceCents = Math.round(priceInrNum * 100);

    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          subcategory: subcategory || null,
          tags,
          price: priceCents,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save the asset.");
        setSaving(false);
        return;
      }
      router.push("/dashboard/uploads");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={error} />

      {/* If the asset is currently REJECTED, surface why so the creator
          knows what to change before re-submitting. The status auto-flips
          to PENDING when they save. */}
      {asset.status === "REJECTED" && asset.rejectionNote && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-gold-muted border border-gold/20 text-gold">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <div className="font-semibold mb-0.5">
              Your edits will resubmit this asset for review.
            </div>
            <div>
              <span className="opacity-80">Rejection note:</span>{" "}
              {asset.rejectionNote}
            </div>
          </div>
        </div>
      )}

      <section className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="title"
              className="block text-xs font-medium text-secondary"
            >
              Title
            </label>
            <span className="text-xs text-muted tabular-nums">
              {title.length}/100
            </span>
          </div>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            placeholder="e.g. Low-poly Crystal Pack"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="description"
              className="block text-xs font-medium text-secondary"
            >
              Description
            </label>
            <span className="text-xs text-muted tabular-nums">
              {description.length}/2000
            </span>
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={10}
            maxLength={2000}
            rows={5}
            required
            placeholder="What's inside, how it was made, what buyers can do with it."
            className="w-full px-4 py-3 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all resize-y"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="category"
              className="block text-xs font-medium text-secondary mb-2"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full h-11 px-3 bg-input border border-border rounded-lg text-sm text-primary focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="subcategory"
              className="block text-xs font-medium text-secondary mb-2"
            >
              Sub-category{" "}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <select
              id="subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={subcategoryOptions.length === 0}
              className="w-full h-11 px-3 bg-input border border-border rounded-lg text-sm text-primary focus:outline-none focus:bg-surface focus:border-border-focus transition-all disabled:opacity-50"
            >
              <option value="">— None —</option>
              {subcategoryOptions.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price quick-pick — same widget creators saw on upload. */}
        <div>
          <label
            htmlFor="price"
            className="block text-xs font-medium text-secondary mb-2"
          >
            Price (INR)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRICE_PRESETS.map((p) => {
              const active = activePreset?.value === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriceInr(p.value)}
                  className={
                    active
                      ? "px-3 h-9 rounded-lg text-sm font-semibold border bg-accent text-white border-accent shadow-[0_0_16px_-2px_rgba(124,58,237,0.6)] transition-all"
                      : "px-3 h-9 rounded-lg text-sm font-medium border bg-input text-secondary border-border hover:text-primary hover:border-border-hover transition-colors"
                  }
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPriceInr(activePreset ? "" : priceInr)}
              className={
                isCustomPrice
                  ? "px-3 h-9 rounded-lg text-sm font-semibold border bg-accent text-white border-accent shadow-[0_0_16px_-2px_rgba(124,58,237,0.6)] transition-all"
                  : "px-3 h-9 rounded-lg text-sm font-medium border bg-input text-secondary border-border hover:text-primary hover:border-border-hover transition-colors"
              }
            >
              Custom
            </button>
          </div>
          {isCustomPrice && (
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted pointer-events-none">
                ₹
              </span>
              <input
                id="price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={priceInr}
                onChange={(e) => setPriceInr(e.target.value)}
                placeholder="e.g. 350"
                className="w-full h-11 pl-7 pr-4 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
              />
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted">
            Use 0 for free assets. Minimum paid price is ₹1.
          </p>
        </div>

        {/* Tag chips — same UX as the upload form. */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="tags-input"
              className="text-xs font-medium text-secondary"
            >
              Tags
            </label>
            <span className="text-xs text-muted tabular-nums">
              {tags.length}/{MAX_TAGS}
            </span>
          </div>

          <div className="min-h-11 px-2 py-1.5 bg-input border border-border rounded-lg flex flex-wrap items-center gap-1.5 focus-within:bg-surface focus-within:border-border-focus transition-all">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-full text-xs bg-accent-muted text-accent-light border border-accent/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-accent/20"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="tags-input"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={() => tagDraft.trim() && commitTag(tagDraft)}
              placeholder={
                tags.length === 0
                  ? "Type a tag and press Enter"
                  : tags.length >= MAX_TAGS
                    ? ""
                    : "Add another"
              }
              disabled={tags.length >= MAX_TAGS}
              className="flex-1 min-w-30 h-7 bg-transparent text-sm text-primary placeholder:text-muted/70 focus:outline-none disabled:opacity-50"
            />
          </div>

          {suggestions.length > 0 && tags.length < MAX_TAGS && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[11px] text-muted self-center mr-1">
                Suggested:
              </span>
              {suggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => commitTag(s)}
                  className="px-2 h-6 rounded-full text-[11px] bg-elevated text-secondary border border-border hover:text-primary hover:border-border-hover transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/uploads")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="min-w-[140px]">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
