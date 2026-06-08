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
  subcategory?: string;
  price?: "free" | "under-200" | "under-500" | "500-plus";
  fileType?: string;
  sort?: "newest" | "popular" | "price-asc" | "price-desc" | "rating";
}

export const CATEGORIES = [
  { slug: "3d-models", name: "3D Models" },
  { slug: "3d-icons", name: "3D Icons" },
  { slug: "lottie", name: "Lottie Animations" },
  { slug: "svg-icons", name: "SVG Icons" },
] as const;

export const FILE_TYPES = [
  { slug: "MODEL_3D", name: "3D Model" },
  { slug: "LOTTIE", name: "Lottie Animation" },
  { slug: "SVG_ICON", name: "SVG Icon" },
] as const;

/**
 * Sub-categories per main category. The lists mirror what Sketchfab,
 * IconScout, and LottieFiles actually surface in production so creators
 * who come from those platforms find familiar buckets here, and buyers
 * can drill down with the same mental model.
 *
 * Keyed by the parent category slug. Each entry is { slug, name }.
 * Slugs are short, lowercase, hyphenated — they appear in URLs as
 * ?subcategory=<slug>. Names are buyer-friendly title-case.
 *
 * Sub-categories are OPTIONAL on every asset (the schema field is
 * nullable), so old uploads continue to work and creators aren't forced
 * to pick one if nothing fits.
 */
export const SUBCATEGORIES: Record<
  string,
  ReadonlyArray<{ slug: string; name: string }>
> = {
  // ─── 3D Models — Sketchfab taxonomy ──────────────────────────────────
  "3d-models": [
    { slug: "characters", name: "Characters & People" },
    { slug: "animals", name: "Animals & Creatures" },
    { slug: "architecture", name: "Architecture & Interiors" },
    { slug: "vehicles", name: "Vehicles & Transport" },
    { slug: "furniture", name: "Furniture & Home Decor" },
    { slug: "food", name: "Food & Drink" },
    { slug: "nature", name: "Nature & Plants" },
    { slug: "electronics", name: "Electronics & Gadgets" },
    { slug: "weapons", name: "Weapons & Military" },
    { slug: "fashion", name: "Fashion & Accessories" },
    { slug: "sports", name: "Sports & Fitness" },
    { slug: "music", name: "Music & Instruments" },
    { slug: "cultural", name: "Cultural & Historical" },
    { slug: "industrial", name: "Industrial & Machinery" },
    { slug: "scifi", name: "Sci-Fi & Fantasy" },
    { slug: "game-assets", name: "Game Assets" },
    { slug: "abstract", name: "Abstract & Art" },
  ],

  // ─── 3D Icons — IconScout 3D library taxonomy ────────────────────────
  "3d-icons": [
    { slug: "avatars", name: "Avatars & People" },
    { slug: "business", name: "Business & Finance" },
    { slug: "communication", name: "Communication" },
    { slug: "devices", name: "Devices & Electronics" },
    { slug: "education", name: "Education & Learning" },
    { slug: "emoji", name: "Emoji & Reactions" },
    { slug: "files", name: "Files & Folders" },
    { slug: "food", name: "Food & Drink" },
    { slug: "gestures", name: "Hands & Gestures" },
    { slug: "medical", name: "Healthcare & Medical" },
    { slug: "holidays", name: "Holidays & Seasons" },
    { slug: "marketing", name: "Marketing & Growth" },
    { slug: "office", name: "Office & Work" },
    { slug: "sports", name: "Sports & Fitness" },
    { slug: "tools", name: "Tools & Equipment" },
    { slug: "transport", name: "Transport & Travel" },
    { slug: "weather", name: "Weather & Climate" },
    { slug: "web-ui", name: "Web & UI" },
  ],

  // ─── Lottie Animations — LottieFiles + IconScout patterns ────────────
  lottie: [
    { slug: "loaders", name: "Loaders & Spinners" },
    { slug: "buttons", name: "Buttons & Toggles" },
    { slug: "onboarding", name: "Onboarding & Welcome" },
    { slug: "empty-states", name: "Empty States" },
    { slug: "success", name: "Success & Confirmation" },
    { slug: "errors", name: "Errors & 404" },
    { slug: "characters", name: "Characters & Avatars" },
    { slug: "notifications", name: "Notifications" },
    { slug: "auth", name: "Authentication" },
    { slug: "logos", name: "Logos & Branding" },
    { slug: "confetti", name: "Confetti & Celebration" },
    { slug: "holidays", name: "Holidays & Seasonal" },
    { slug: "education", name: "Education" },
    { slug: "food", name: "Food & Drink" },
    { slug: "finance", name: "Finance & Business" },
    { slug: "health", name: "Health & Fitness" },
    { slug: "gaming", name: "Gaming" },
    { slug: "music", name: "Music & Audio" },
    { slug: "nature", name: "Nature & Weather" },
    { slug: "travel", name: "Travel & Maps" },
    { slug: "security", name: "Cybersecurity & Privacy" },
    { slug: "social", name: "Social & Communication" },
  ],

  // ─── SVG Icons — shared across IconScout / Iconify / FlatIcon ────────
  "svg-icons": [
    { slug: "arrows", name: "Arrows & Direction" },
    { slug: "avatars", name: "Avatars & People" },
    { slug: "business", name: "Business & Finance" },
    { slug: "communication", name: "Communication" },
    { slug: "design", name: "Design & Tools" },
    { slug: "devices", name: "Devices & Hardware" },
    { slug: "education", name: "Education" },
    { slug: "files", name: "Files & Documents" },
    { slug: "food", name: "Food & Drink" },
    { slug: "medical", name: "Health & Medical" },
    { slug: "home", name: "Home & Furniture" },
    { slug: "marketing", name: "Marketing & SEO" },
    { slug: "media", name: "Media & Music" },
    { slug: "nature", name: "Nature & Weather" },
    { slug: "photography", name: "Photography" },
    { slug: "security", name: "Security" },
    { slug: "shopping", name: "Shopping & E-commerce" },
    { slug: "social", name: "Social Media" },
    { slug: "sports", name: "Sports & Fitness" },
    { slug: "tools", name: "Tools & Construction" },
    { slug: "transport", name: "Transport & Travel" },
    { slug: "ui", name: "UI / UX" },
  ],
};

/**
 * Returns the sub-category list for a given main category slug, or an
 * empty array when the category has no defined sub-categories (e.g.
 * legacy `materials`). Safe to call with anything — the upload form
 * uses it to populate the dropdown.
 */
export function subcategoriesFor(
  categorySlug: string | undefined | null
): ReadonlyArray<{ slug: string; name: string }> {
  if (!categorySlug) return [];
  return SUBCATEGORIES[categorySlug] ?? [];
}

/**
 * Server-side validation. Returns true when (category, subcategory) is
 * a legal pair — either subcategory is empty/null, OR it's present in
 * the SUBCATEGORIES[category] list. Reject unknown slugs in the upload
 * API so creators can't smuggle arbitrary URL-safe strings into the
 * filter taxonomy.
 */
export function isValidSubcategory(
  categorySlug: string,
  subcategorySlug: string | null | undefined
): boolean {
  if (!subcategorySlug) return true;
  const list = SUBCATEGORIES[categorySlug];
  if (!list) return false;
  return list.some((s) => s.slug === subcategorySlug);
}

/**
 * Lookup the display name for a (category, subcategory) pair. Returns
 * null when the pair isn't valid — pages should fall back to "—" or
 * hide the line in that case.
 */
export function subcategoryName(
  categorySlug: string,
  subcategorySlug: string | null | undefined
): string | null {
  if (!subcategorySlug) return null;
  const list = SUBCATEGORIES[categorySlug];
  if (!list) return null;
  return list.find((s) => s.slug === subcategorySlug)?.name ?? null;
}

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
