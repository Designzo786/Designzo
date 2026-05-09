import Link from "next/link";
import {
  Box,
  Image as ImageIcon,
  Mountain,
  Layers,
  Puzzle,
  Palette,
  ArrowUpRight,
} from "lucide-react";

const CATEGORIES = [
  {
    slug: "3d-models",
    name: "3D Models",
    description: "Game-ready models, characters, props",
    count: "2,400+ assets",
    icon: Box,
    accent: "from-violet-500/20 to-purple-500/5",
  },
  {
    slug: "textures",
    name: "Textures",
    description: "PBR textures, surfaces, decals",
    count: "1,800+ assets",
    icon: Palette,
    accent: "from-fuchsia-500/20 to-pink-500/5",
  },
  {
    slug: "hdris",
    name: "HDRIs",
    description: "Environment maps and skies",
    count: "500+ assets",
    icon: Mountain,
    accent: "from-amber-500/20 to-orange-500/5",
  },
  {
    slug: "materials",
    name: "Materials",
    description: "Shaders and surface materials",
    count: "1,200+ assets",
    icon: Layers,
    accent: "from-emerald-500/20 to-teal-500/5",
  },
  {
    slug: "2d-graphics",
    name: "2D Graphics",
    description: "Illustrations, vectors, sprites",
    count: "3,000+ assets",
    icon: ImageIcon,
    accent: "from-blue-500/20 to-cyan-500/5",
  },
  {
    slug: "plugins",
    name: "Plugins",
    description: "Tools and creator add-ons",
    count: "400+ assets",
    icon: Puzzle,
    accent: "from-rose-500/20 to-red-500/5",
  },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Browse by category
          </h2>
          <p className="mt-2 text-secondary">
            Find the perfect asset for your next project
          </p>
        </div>
        <Link
          href="/explore"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:text-accent transition-colors"
        >
          View all
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              href={`/explore?category=${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border hover:border-border-hover bg-surface hover:bg-elevated p-6 transition-all"
            >
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-to-br ${cat.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light group-hover:scale-110 group-hover:border-accent transition-all">
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all -translate-x-1 group-hover:translate-x-0" />
              </div>
              <h3 className="relative mt-5 text-lg font-semibold text-primary">
                {cat.name}
              </h3>
              <p className="relative mt-1 text-sm text-muted">
                {cat.description}
              </p>
              <div className="relative mt-4 text-xs font-medium text-secondary">
                {cat.count}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
