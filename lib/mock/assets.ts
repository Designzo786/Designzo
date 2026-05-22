/**
 * Mock asset data for the Explore page UI shell.
 * Phase 6+ will replace these with Prisma queries against the real DB.
 */

export type MockAssetShape =
  | "icosahedron"
  | "torusKnot"
  | "sphere"
  | "box"
  | "torus"
  | "octahedron"
  | "cone"
  | "cylinder"
  | "dodecahedron"
  | "tetrahedron";

export interface MockAsset {
  id: string;
  title: string;
  creator: string;
  price: number; // INR paise (0 = free)
  category:
    | "3d-models"
    | "textures"
    | "hdris"
    | "materials"
    | "2d-graphics"
    | "plugins";
  fileType: "MODEL_3D" | "TEXTURE" | "HDRI" | "MATERIAL" | "IMAGE_2D" | "PLUGIN";
  tags: string[];
  rating: number;
  downloads: number;
  createdAt: string;
  preview: { shape: MockAssetShape; color: string };
  description: string;
  format: string;
  fileSize: number; // bytes
}

export const MOCK_ASSETS: MockAsset[] = [
  { id: "neon-icosahedron", title: "Neon Icosahedron", creator: "neonworks", price: 19900, category: "3d-models", fileType: "MODEL_3D", tags: ["abstract", "lowpoly", "neon"], rating: 4.9, downloads: 1240, createdAt: "2026-04-25", preview: { shape: "icosahedron", color: "#a855f7" }, description: "A high-detail icosahedron with iridescent neon shading. Perfect for sci-fi UI accents, abstract scenes, and motion-design hero moments.", format: ".glb, .fbx", fileSize: 4_404_019 },
  { id: "twisted-knot", title: "Twisted Knot", creator: "polylab", price: 24900, category: "3d-models", fileType: "MODEL_3D", tags: ["geometric", "abstract"], rating: 4.7, downloads: 892, createdAt: "2026-04-22", preview: { shape: "torusKnot", color: "#7c3aed" }, description: "A stylized torus knot designed as a hero element for landing pages, intros, and motion design — clean topology and ready to import.", format: ".glb, .fbx", fileSize: 7_130_316 },
  { id: "soft-orb", title: "Soft Orb Material", creator: "mokumoku", price: 0, category: "materials", fileType: "MATERIAL", tags: ["pbr", "soft"], rating: 4.8, downloads: 5340, createdAt: "2026-04-28", preview: { shape: "sphere", color: "#f59e0b" }, description: "A soft PBR sphere material with subtle subsurface translucency. Ideal for skin, jelly, wax, and stylized character work.", format: ".mat, .glsl", fileSize: 1_468_006 },
  { id: "cube-lattice", title: "Cube Lattice Pack", creator: "harden", price: 14900, category: "3d-models", fileType: "MODEL_3D", tags: ["architecture", "modular"], rating: 4.6, downloads: 421, createdAt: "2026-04-20", preview: { shape: "box", color: "#10b981" }, description: "A modular cube-lattice pack — snap pieces together to build procedural architecture and abstract environments without modeling.", format: ".glb, .fbx, .obj", fileSize: 11_848_909 },
  { id: "donut-ring", title: "Donut Ring", creator: "pixelvault", price: 9900, category: "3d-models", fileType: "MODEL_3D", tags: ["food", "stylized"], rating: 4.5, downloads: 678, createdAt: "2026-04-18", preview: { shape: "torus", color: "#3b82f6" }, description: "A stylized donut model rigged for animation. Includes glaze and sprinkle variants as separate material slots.", format: ".blend, .fbx", fileSize: 3_774_873 },
  { id: "octahedron-set", title: "Crystal Octahedron Set", creator: "radial", price: 22900, category: "3d-models", fileType: "MODEL_3D", tags: ["crystal", "gem"], rating: 4.9, downloads: 1502, createdAt: "2026-04-26", preview: { shape: "octahedron", color: "#ec4899" }, description: "A pack of six crystal octahedrons in low-poly and high-poly variants, each with full PBR materials and dispersion.", format: ".glb, .fbx", fileSize: 19_084_902 },
  { id: "iridescent-shader", title: "Iridescent Shader", creator: "matlab", price: 34900, category: "materials", fileType: "MATERIAL", tags: ["shader", "iridescent"], rating: 4.9, downloads: 678, createdAt: "2026-04-27", preview: { shape: "icosahedron", color: "#22d3ee" }, description: "A real-time iridescent shader with full PBR support. Includes GLSL source and a drop-in Three.js example.", format: ".glsl, .js", fileSize: 419_430 },
  { id: "glass-cylinder", title: "Glass Cylinder Vase", creator: "minimal", price: 12900, category: "3d-models", fileType: "MODEL_3D", tags: ["glass", "minimal"], rating: 4.6, downloads: 489, createdAt: "2026-04-19", preview: { shape: "cylinder", color: "#84cc16" }, description: "A minimalist glass cylinder vase with refraction and dispersion. Ideal for product mockups and editorial shots.", format: ".glb, .fbx", fileSize: 2_202_009 },
  { id: "low-poly-tree", title: "Low Poly Tree", creator: "stylized", price: 0, category: "3d-models", fileType: "MODEL_3D", tags: ["nature", "lowpoly", "free"], rating: 4.5, downloads: 8934, createdAt: "2026-04-30", preview: { shape: "cone", color: "#22c55e" }, description: "Five low-poly tree variants with stylized canopies. Free for personal and commercial use, no attribution required.", format: ".glb, .fbx", fileSize: 1_782_579 },
  { id: "cloth-material", title: "Cloth Material Bundle", creator: "matlab", price: 24900, category: "materials", fileType: "MATERIAL", tags: ["cloth", "fabric"], rating: 4.8, downloads: 745, createdAt: "2026-04-14", preview: { shape: "sphere", color: "#f43f5e" }, description: "A bundle of eight cloth materials — linen, silk, wool, denim — with PBR and microfiber detail maps.", format: ".png, .jpg", fileSize: 40_475_852 },
];

export interface AssetFilters {
  q?: string;
  category?: string;
  price?: "free" | "under-200" | "under-500" | "500-plus";
  fileType?: string;
  sort?: "newest" | "popular" | "price-asc" | "price-desc" | "rating";
}

export function filterAssets(
  assets: MockAsset[],
  filters: AssetFilters
): MockAsset[] {
  let result = [...assets];

  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.creator.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    result = result.filter((a) => a.category === filters.category);
  }

  if (filters.fileType) {
    result = result.filter((a) => a.fileType === filters.fileType);
  }

  switch (filters.price) {
    case "free":
      result = result.filter((a) => a.price === 0);
      break;
    case "under-200":
      result = result.filter((a) => a.price > 0 && a.price < 20000);
      break;
    case "under-500":
      result = result.filter((a) => a.price > 0 && a.price < 50000);
      break;
    case "500-plus":
      result = result.filter((a) => a.price >= 50000);
      break;
  }

  switch (filters.sort) {
    case "popular":
      result.sort((a, b) => b.downloads - a.downloads);
      break;
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
    default:
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  return result;
}

export function getAssetById(id: string): MockAsset | undefined {
  return MOCK_ASSETS.find((a) => a.id === id);
}

export function getRelatedAssets(asset: MockAsset, limit = 3): MockAsset[] {
  const sameCategory = MOCK_ASSETS.filter(
    (a) => a.id !== asset.id && a.category === asset.category
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const others = MOCK_ASSETS.filter(
    (a) => a.id !== asset.id && a.category !== asset.category
  ).sort((a, b) => b.downloads - a.downloads);
  return [...sameCategory, ...others].slice(0, limit);
}

export const CATEGORIES = [
  { slug: "3d-models", name: "3D Models" },
  { slug: "materials", name: "Materials" },
] as const;

export const FILE_TYPES = [
  { slug: "MODEL_3D", name: "3D Model" },
  { slug: "MATERIAL", name: "Material" },
] as const;

export const PRICE_RANGES = [
  { slug: "free", name: "Free" },
  { slug: "under-200", name: "Under ₹200" },
  { slug: "under-500", name: "Under ₹500" },
  { slug: "500-plus", name: "₹500+" },
] as const;

export const SORT_OPTIONS = [
  { slug: "newest", name: "Newest" },
  { slug: "popular", name: "Most Popular" },
  { slug: "rating", name: "Top Rated" },
  { slug: "price-asc", name: "Price: Low to High" },
  { slug: "price-desc", name: "Price: High to Low" },
] as const;
