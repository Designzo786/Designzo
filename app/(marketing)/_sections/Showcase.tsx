import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MOCK_ASSETS } from "@/lib/mock/assets";
import { AssetCard } from "@/components/assets/AssetCard";

const FEATURED = MOCK_ASSETS.slice(0, 6);

export function Showcase() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          Interactive 3D Previews
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Stunning 3D, right in your browser
        </h2>
        <p className="mt-3 text-secondary">
          Every asset ships with a real-time interactive preview. Click any card
          to inspect every angle.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURED.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:border-accent/40 text-sm font-medium text-secondary hover:text-accent-light transition-colors"
        >
          Browse all assets
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
