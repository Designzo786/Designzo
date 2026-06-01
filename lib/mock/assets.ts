/**
 * Asset taxonomy: the canonical lists of categories, file types, price
 * ranges, and sort options the explore page uses. The mock data that
 * formerly lived here has been removed — the marketplace now runs entirely
 * on real DB rows. These constants stay because they describe the
 * domain (not test fixtures) and are shared between the filter UI, the
 * upload form, and the DB query builders.
 *
 * The `MockAssetShape` type is also retained: it enumerates the
 * Three.js primitives the fallback preview card can render when an
 * uploaded asset has no preview image or .glb model.
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

export interface AssetFilters {
  q?: string;
  category?: string;
  price?: "free" | "under-200" | "under-500" | "500-plus";
  fileType?: string;
  sort?: "newest" | "popular" | "price-asc" | "price-desc" | "rating";
}

export const CATEGORIES = [
  { slug: "3d-models", name: "3D Models" },
  { slug: "3d-icons", name: "3D Icons" },
  { slug: "lottie", name: "Lottie Animations" },
  { slug: "svg-icons", name: "SVG Icons" },
  { slug: "materials", name: "Materials" },
] as const;

export const FILE_TYPES = [
  { slug: "MODEL_3D", name: "3D Model" },
  { slug: "MATERIAL", name: "Material" },
  { slug: "LOTTIE", name: "Lottie / JSON Animation" },
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
