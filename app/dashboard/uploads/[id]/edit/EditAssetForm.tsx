"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Boxes, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { CATEGORIES, subcategoriesFor } from "@/lib/mock/assets";
import { formatFileSize } from "@/lib/utils";
import type { AssetStatus } from "@prisma/client";

const MAX_PACK_ITEM_BYTES = 100 * 1024 * 1024;
const MAX_PACK_PNG_BYTES = 8 * 1024 * 1024;
const MAX_PACK_BLEND_BYTES = 50 * 1024 * 1024;
const MAX_PACK_TOTAL = 60;

interface PackItemSummary {
  id: string;
  name: string;
  pngUrl: string | null;
  fileSizeBytes: number;
}

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
    fileType: string;
    /** Every pack item currently attached. Empty array for single-
     *  listing 3D / Lottie / SVG uploads — drives whether the pack-
     *  edit section renders at all. */
    packItems: PackItemSummary[];
  };
}

interface PackAddEntry {
  file: File;
  png?: File;
  blend?: File;
}

function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function basenameNoExt(name: string): string {
  return name
    .replace(/^.*[/\\]/, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
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

  // Pack-edit state — only meaningful when the listing is already a
  // pack. `packRemove` is the set of existing item ids the creator
  // wants to drop; `packAdd` is the queue of new items they want to
  // upload. Both ship together in the PATCH body.
  const isPack = asset.packItems.length > 0;
  const [packRemove, setPackRemove] = useState<Set<string>>(new Set());
  const [packAdd, setPackAdd] = useState<PackAddEntry[]>([]);
  const packInputRef = useRef<HTMLInputElement>(null);

  const remainingPackCount =
    asset.packItems.length - packRemove.size + packAdd.length;

  function toggleRemove(id: string) {
    setPackRemove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeNewItem(idx: number) {
    setPackAdd((prev) => prev.filter((_, i) => i !== idx));
  }

  function onPackAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const newGlbs: File[] = [];
    const pngByBase = new Map<string, File>();
    const blendByBase = new Map<string, File>();
    let reject: string | null = null;

    for (const f of incoming) {
      const ext = getExt(f.name);
      const base = basenameNoExt(f.name);
      if (ext === "glb" || ext === "gltf") {
        if (f.size > MAX_PACK_ITEM_BYTES) {
          reject = `"${f.name}" exceeds 100 MB.`;
          continue;
        }
        newGlbs.push(f);
      } else if (ext === "png") {
        if (f.size > MAX_PACK_PNG_BYTES) {
          reject = `"${f.name}" exceeds 8 MB.`;
          continue;
        }
        pngByBase.set(base, f);
      } else if (ext === "blend") {
        if (f.size > MAX_PACK_BLEND_BYTES) {
          reject = `"${f.name}" exceeds 50 MB.`;
          continue;
        }
        blendByBase.set(base, f);
      } else {
        reject = `"${f.name}" isn't a .glb / .gltf / .png / .blend — skipped.`;
      }
    }

    setPackAdd((prev) => {
      const next = [...prev];
      for (const g of newGlbs) {
        if (
          asset.packItems.length - packRemove.size + next.length >=
          MAX_PACK_TOTAL
        )
          break;
        const base = basenameNoExt(g.name);
        next.push({
          file: g,
          png: pngByBase.get(base),
          blend: blendByBase.get(base),
        });
        pngByBase.delete(base);
        blendByBase.delete(base);
      }
      // Late-pair any remaining png/blend onto already-queued items.
      for (let i = 0; i < next.length; i++) {
        const base = basenameNoExt(next[i].file.name);
        if (!next[i].png && pngByBase.has(base)) {
          next[i] = { ...next[i], png: pngByBase.get(base) };
          pngByBase.delete(base);
        }
        if (!next[i].blend && blendByBase.has(base)) {
          next[i] = { ...next[i], blend: blendByBase.get(base) };
          blendByBase.delete(base);
        }
      }
      return next;
    });

    if (reject) setError(reject);
    if (packInputRef.current) packInputRef.current.value = "";
  }

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

    if (remainingPackCount < 1 && isPack) {
      return setError(
        "A pack must keep at least one item — un-mark a removal or delete the listing instead."
      );
    }
    if (remainingPackCount > MAX_PACK_TOTAL) {
      return setError(
        `Pack would exceed the ${MAX_PACK_TOTAL}-item ceiling — drop some new items.`
      );
    }

    setSaving(true);
    try {
      // ── Step 1: upload any NEW pack items direct-to-R2 ──────────
      // Same signed-URL flow the new-upload form uses. We only ask the
      // server for the slots we actually need (file + optional png +
      // optional blend per new item).
      let packAddPayload: Array<{
        name: string;
        fileKey: string;
        pngKey?: string;
        blendKey?: string;
      }> = [];

      if (packAdd.length > 0) {
        const slotsRequest: Record<string, { name: string; size: number }> = {};
        // Minimum required for the upload-url route to accept the
        // request — `file` + `preview` are always required at issue
        // time, but the route doesn't *need* a real file/preview slot
        // for a pack-edit call. We send a dummy `file` that maps to
        // packAdd[0]'s glb just to satisfy the route guard, and we
        // skip preview entirely. Actually — the route requires file +
        // preview only for the INITIAL upload-url payload. Re-using
        // the same endpoint here, we set file=glb-of-first-new-item
        // and intentionally omit preview (route allows that for the
        // LOTTIE fileType only). For MODEL_3D the route requires
        // preview, so we send a tiny placeholder slot using the first
        // new item's PNG if present, or fall back to gracefully
        // requesting just packItem<N> slots and validating server-side.
        //
        // Simpler approach: request only the packItem<N>* slots. The
        // upload-url route requires a `file` slot, so we use the
        // first new item's .glb in the `file` slot AND in packItem0.
        // The browser uploads it once (same File reference); the
        // server validates both keys (same R2 object) idempotently.
        packAdd.forEach((p, i) => {
          slotsRequest[`packItem${i}`] = {
            name: p.file.name,
            size: p.file.size,
          };
          if (p.png) {
            slotsRequest[`packItem${i}Png`] = {
              name: p.png.name,
              size: p.png.size,
            };
          }
          if (p.blend) {
            slotsRequest[`packItem${i}Blend`] = {
              name: p.blend.name,
              size: p.blend.size,
            };
          }
        });
        // Required by the upload-url route — reuse packAdd[0].file as
        // the cover so we don't have to PUT it twice. The server's
        // commit route uses `keys.file` only for the new-asset path,
        // but the upload-url route currently requires it on every
        // request. Same File reference → one PUT.
        slotsRequest.file = {
          name: packAdd[0].file.name,
          size: packAdd[0].file.size,
        };

        const signRes = await fetch("/api/assets/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: asset.fileType, slots: slotsRequest }),
        });
        if (!signRes.ok) {
          const data = await signRes.json().catch(() => ({}));
          setError(
            data.error ?? "Could not get upload URLs for new pack items."
          );
          setSaving(false);
          return;
        }
        const signed = (await signRes.json()) as {
          slots: Record<string, { key: string; url: string; contentType: string }>;
        };

        // PUT every file. We skip the `file` slot here because its
        // signed URL is the same key the browser will write via
        // packItem0 — but the URLs themselves are DIFFERENT signed
        // URLs pointing at DIFFERENT R2 keys. Easier to just PUT
        // every slot the server issued, then ignore the file slot
        // when building the commit body. The cost is one extra PUT
        // of the cover .glb — negligible for an edit operation.
        for (const [slotName, info] of Object.entries(signed.slots)) {
          let source: File | undefined;
          if (slotName === "file") source = packAdd[0].file;
          else {
            const idxMatch = slotName.match(/^packItem(\d+)(Png|Blend)?$/);
            if (!idxMatch) continue;
            const idx = Number(idxMatch[1]);
            const tail = idxMatch[2];
            const entry = packAdd[idx];
            if (!entry) continue;
            source = tail === "Png" ? entry.png : tail === "Blend" ? entry.blend : entry.file;
          }
          if (!source) continue;
          const putRes = await fetch(info.url, {
            method: "PUT",
            headers: { "Content-Type": info.contentType },
            body: source,
          });
          if (!putRes.ok) {
            setError(`Storage upload failed (HTTP ${putRes.status}).`);
            setSaving(false);
            return;
          }
        }

        // Build the packAdd payload from the keys the server issued.
        packAddPayload = packAdd.map((p, i) => {
          const main = signed.slots[`packItem${i}`];
          if (!main) {
            throw new Error(`upload-url didn't return packItem${i}`);
          }
          return {
            name: p.file.name.replace(/\.[^.]+$/, "").slice(0, 100),
            fileKey: main.key,
            pngKey: p.png ? signed.slots[`packItem${i}Png`]?.key : undefined,
            blendKey: p.blend ? signed.slots[`packItem${i}Blend`]?.key : undefined,
          };
        });
      }

      // ── Step 2: PATCH the asset with metadata + pack mutations ──
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
          packRemove: Array.from(packRemove),
          packAdd: packAddPayload,
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

      {/* Pack management — only renders for listings that ARE packs.
          Lists existing items with checkbox-style "remove" toggle,
          followed by a "+ add icons" dropzone that auto-pairs
          .glb/.png/.blend by basename (same logic as the upload form).
          Save commits both removes + adds in one PATCH. */}
      {isPack && (
        <section className="rounded-2xl border border-info/20 bg-info-muted/40 p-5 sm:p-6 space-y-4">
          <header className="flex items-start gap-2.5">
            <Boxes className="w-4 h-4 text-info mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-primary">
                Pack contents ({remainingPackCount}/{MAX_PACK_TOTAL})
              </h2>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                Click a row to mark it for removal, or drop new
                .glb / .gltf icons below (optional matching .png + .blend
                auto-pair by basename). Changes commit when you Save.
              </p>
            </div>
          </header>

          <ul className="space-y-1.5">
            {asset.packItems.map((item, i) => {
              const marked = packRemove.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    marked
                      ? "border-danger/30 bg-danger-muted/30 line-through opacity-60"
                      : "border-border bg-surface"
                  }`}
                >
                  {item.pngUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.pngUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-md object-cover bg-canvas shrink-0 border border-border"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-md bg-canvas shrink-0 border border-border flex items-center justify-center text-lg text-muted/40">
                      ⋄
                    </span>
                  )}
                  <span className="text-[11px] tabular-nums text-muted w-6 shrink-0">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-primary truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-muted">
                      {formatFileSize(item.fileSizeBytes)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRemove(item.id)}
                    aria-pressed={marked ? "true" : "false"}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      marked
                        ? "text-danger bg-danger-muted border border-danger/40"
                        : "text-muted border border-border hover:text-danger hover:border-danger/30"
                    }`}
                  >
                    {marked ? "Will remove" : "Remove"}
                  </button>
                </li>
              );
            })}

            {/* New items queued for this save */}
            {packAdd.map((p, i) => (
              <li
                key={`new-${i}-${p.file.name}`}
                className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-muted/30 px-3 py-2"
              >
                <span className="w-10 h-10 rounded-md bg-accent text-white shrink-0 flex items-center justify-center text-xs font-bold">
                  NEW
                </span>
                <span className="text-[11px] tabular-nums text-accent-light w-6 shrink-0">
                  #{asset.packItems.length - packRemove.size + i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary truncate">
                    {p.file.name}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-2">
                    <span>{formatFileSize(p.file.size)}</span>
                    {p.png && (
                      <span className="text-info">· .png</span>
                    )}
                    {p.blend && (
                      <span className="text-gold">· .blend</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeNewItem(i)}
                  aria-label={`Drop new item ${p.file.name}`}
                  className="w-7 h-7 rounded-md text-muted hover:text-danger hover:bg-danger/10 border border-border hover:border-danger/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>

          {/* Dropzone for new pack items */}
          <button
            type="button"
            onClick={() => packInputRef.current?.click()}
            disabled={remainingPackCount >= MAX_PACK_TOTAL}
            className="w-full rounded-xl border-2 border-dashed border-border bg-canvas/40 hover:bg-canvas hover:border-accent/40 transition-colors px-4 py-5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 mx-auto text-muted/60 mb-1" />
            <div className="text-sm font-medium text-secondary">
              Add more icons to this pack
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              .glb / .gltf required — drop matching .png and .blend by
              basename to auto-pair
            </div>
          </button>
          <input
            ref={packInputRef}
            type="file"
            aria-label="Add new pack items"
            accept=".glb,.gltf,.png,.blend,model/gltf-binary,model/gltf+json,image/png,application/octet-stream"
            multiple
            onChange={onPackAddChange}
            className="hidden"
          />
        </section>
      )}

      {/* If the asset is currently REJECTED or NEEDS_IMPROVEMENT,
          surface the admin's note so the creator knows what to change
          before re-submitting. The status auto-flips to PENDING when
          they save in either case. */}
      {(asset.status === "REJECTED" ||
        asset.status === "NEEDS_IMPROVEMENT") &&
        asset.rejectionNote && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-gold-muted border border-gold/20 text-gold">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-semibold mb-0.5">
                {asset.status === "NEEDS_IMPROVEMENT"
                  ? "An admin asked for some changes."
                  : "Your edits will resubmit this asset for review."}
              </div>
              <div>
                <span className="opacity-80">
                  {asset.status === "NEEDS_IMPROVEMENT"
                    ? "Admin note:"
                    : "Rejection note:"}
                </span>{" "}
                {asset.rejectionNote}
              </div>
              {asset.status === "NEEDS_IMPROVEMENT" && (
                <div className="mt-1 opacity-80">
                  Saving will move the asset back into the review queue.
                </div>
              )}
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
