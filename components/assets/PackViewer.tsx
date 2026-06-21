"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const AssetViewer = dynamic(() => import("./AssetViewer"), {
  loading: () => <div className="absolute inset-0 skeleton" />,
});

interface PackItem {
  id: string;
  name: string;
  modelUrl: string;
  /** Optional flat PNG render — shown as the slider thumbnail when
   *  the creator shipped one. Falls back to a diamond glyph otherwise. */
  pngUrl: string | null;
}

interface Props {
  /** Pack listing title — passed through to AssetViewer for SR / a11y. */
  title: string;
  /** Always MODEL_3D for icon packs; kept generic so the player wrapper
   *  can be reused for hypothetical future pack types. */
  fileType: string;
  /** Items in display order. The first one renders by default and
   *  doubles as the listing's cover model. */
  items: PackItem[];
}

/**
 * Pack-listing viewer with a slider strip beneath the main player.
 *
 * Each icon in the pack gets a thumb in the strip; clicking any thumb
 * swaps the AssetViewer's `modelUrl` to that item so a buyer can
 * preview every icon individually before purchase. The component is
 * intentionally a thin shell around AssetViewer — no re-implementation
 * of camera / lighting / lazy-mount — so single-asset and pack-asset
 * detail pages share the same renderer.
 *
 * The strip is a horizontal scroll on phones (snap-x for tactile feel)
 * and a wrap grid at >= sm so wide screens see every item without
 * scrolling. Each item shows its 1-based index + name; the active
 * thumb gets an accent border so the "you're previewing #5 of 24"
 * relationship reads instantly.
 */
export function PackViewer({ title, fileType, items }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = items[activeIndex] ?? items[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square lg:aspect-4/3 rounded-2xl overflow-hidden border border-border bg-linear-to-br from-elevated to-canvas">
        <AssetViewer
          fileType={fileType}
          modelUrl={active.modelUrl}
          title={`${title} — ${active.name}`}
        />
        {/* Pack-size + position chip — tiny anchor so the buyer always
            knows where they are in a 12+ icon pack. */}
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-canvas/80 backdrop-blur text-[11px] font-semibold text-secondary border border-border">
          <span className="text-accent-light tabular-nums">
            {activeIndex + 1}
          </span>
          <span className="text-muted">/</span>
          <span className="tabular-nums">{items.length}</span>
          <span className="text-muted ml-0.5">in this pack</span>
        </div>
        {fileType === "MODEL_3D" && (
          <div className="hidden sm:flex absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-canvas/80 backdrop-blur text-xs text-muted border border-border whitespace-nowrap">
            Drag to rotate · Scroll to zoom
          </div>
        )}
      </div>

      {/* Slider strip — every icon is a clickable thumb. The active
          item gets an accent ring so the buyer always knows which
          one's loaded in the main viewer above. */}
      <div className="rounded-xl border border-border bg-surface p-2.5">
        <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2 px-1">
          All icons in this pack
        </div>
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-0.5 px-0.5">
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-pressed={isActive ? "true" : "false"}
                aria-label={`Preview ${item.name}`}
                title={item.name}
                className={`group relative shrink-0 snap-start w-20 sm:w-22 rounded-lg border transition-all ${
                  isActive
                    ? "border-accent ring-2 ring-accent/40 bg-elevated"
                    : "border-border bg-elevated/40 hover:border-border-hover hover:bg-elevated"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full text-[10px] font-bold tabular-nums flex items-center justify-center z-10 ${
                    isActive
                      ? "bg-accent text-white"
                      : "bg-canvas/80 text-muted border border-border"
                  }`}
                >
                  {i + 1}
                </span>
                {/* Per-item PNG render when the creator shipped one
                    — gives the buyer a real thumbnail before they
                    click. Falls back to a glyph placeholder otherwise
                    so even .glb-only packs still look intentional.
                    glTF in an <img>-like preview tile would be too
                    heavy at thumb size, so we don't try to render the
                    .glb directly here. */}
                {item.pngUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.pngUrl}
                    alt={item.name}
                    loading="lazy"
                    className="block aspect-square rounded-lg object-cover bg-canvas/40"
                  />
                ) : (
                  <span className="block aspect-square rounded-lg flex items-center justify-center text-3xl text-muted/40">
                    ⋄
                  </span>
                )}
                <span
                  className={`block text-[10px] font-medium truncate px-1.5 py-1 ${
                    isActive ? "text-primary" : "text-secondary"
                  }`}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
