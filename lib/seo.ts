/**
 * SEO + structured-data helpers shared across page metadata generators
 * and the JsonLd component. Pure functions — no React, no Prisma — so
 * sitemap.ts / robots.ts / page metadata can all import without
 * pulling extra dependencies.
 */
import { getPublicBaseUrl } from "./env";

const SITE_NAME = "Dezignxo";
const DEFAULT_DESCRIPTION =
  "Premium 3D models, 3D icons, Lottie animations, and SVG icons for designers, game developers, and product teams. Royalty-free commercial license included with every purchase.";

/** Canonical absolute URL for a path under the marketplace. */
export function absoluteUrl(path: string): string {
  const base = getPublicBaseUrl();
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean === "/" ? "" : clean}`;
}

/** Strip + truncate user-supplied description to a length that won't
 *  get cut off in a SERP snippet (~160 chars). Falls back to the site
 *  default when the input is empty or pathologically short. */
export function clipDescription(raw: string | undefined, max = 160): string {
  if (!raw || raw.trim().length < 20) return DEFAULT_DESCRIPTION;
  const stripped = raw
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  // Truncate at the nearest word boundary so we don't break mid-word.
  const slice = stripped.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > max - 30 ? slice.slice(0, lastSpace) : slice) + "…";
}

/**
 * Site-wide WebSite schema. Tells Google we're searchable and what
 * the SERP sitelinks-search-box should point at — gives us the
 * "search this site" widget under the brand query.
 */
export function buildWebSiteSchema(): Record<string, unknown> {
  const base = getPublicBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/`,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Organization schema for the home page. Drives the Knowledge Panel
 * Google sometimes shows for brand queries.
 */
export function buildOrganizationSchema(): Record<string, unknown> {
  const base = getPublicBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    alternateName: ["Dezignxo Marketplace", "Dezignxo Store"],
    url: `${base}/`,
    logo: {
      "@type": "ImageObject",
      url: `${base}/icon.svg`,
      width: 256,
      height: 256,
    },
    image: `${base}/opengraph-image`,
    description: DEFAULT_DESCRIPTION,
    foundingDate: "2026",
    knowsAbout: [
      "3D Models",
      "3D Icons",
      "Lottie Animations",
      "SVG Icons",
      "Digital Asset Marketplace",
      "Royalty-free Assets",
    ],
    sameAs: [
      // Add real social handles here when they exist — Google reads
      // these to merge our brand with its own knowledge graph.
      // "https://twitter.com/dezignxo",
      // "https://github.com/dezignxo",
    ],
  };
}

/**
 * SiteNavigationElement list — declares the primary navigation paths
 * Google can use to populate **sitelinks** under the brand SERP. Not
 * a guarantee (sitelinks are still algorithm-decided based on traffic
 * patterns), but listing them explicitly is the single biggest
 * eligibility signal for a new domain. Each entry is a category /
 * top-level feature page that we want to win a sitelink slot.
 */
export function buildSiteNavigationSchema(): Record<string, unknown> {
  const base = getPublicBaseUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SiteNavigationElement",
        name: "Explore",
        description: "Browse every approved 3D, Lottie, and SVG asset on Dezignxo.",
        url: `${base}/explore`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "3D Models",
        description: "Production-ready glTF, FBX, OBJ, Blender, and USDZ models.",
        url: `${base}/explore?category=3d-models`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "3D Icons",
        description: "Stylized 3D icon packs with PNG renders + glTF source files.",
        url: `${base}/explore?category=3d-icons`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Lottie Animations",
        description: "Lightweight Bodymovin + dotLottie animations with optional GIF/MP4.",
        url: `${base}/explore?category=lottie`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "SVG Icons",
        description: "Vector icon sets in outline, filled, and duotone styles.",
        url: `${base}/explore?category=svg-icons`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "AI Generate",
        description: "Describe an asset and get a live 3D preview to refine and save.",
        url: `${base}/ai-generate`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Sell",
        description: "Upload your work, set a price, keep the majority of every sale.",
        url: `${base}/sell`,
      },
      {
        "@type": "SiteNavigationElement",
        name: "Help",
        description: "Buyer and creator help center.",
        url: `${base}/help`,
      },
    ],
  };
}

interface BreadcrumbItem {
  name: string;
  /** Relative path; absoluteUrl is applied internally. */
  path: string;
}

/**
 * BreadcrumbList schema — shows up under the listing in SERP as a
 * clickable trail (Home › Explore › 3D Models › <asset title>) instead
 * of the raw URL. Significantly improves CTR on long URLs.
 */
export function buildBreadcrumbSchema(
  items: BreadcrumbItem[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

interface ProductSchemaInput {
  id: string;
  title: string;
  description: string;
  /** Absolute or relative URL — relative gets the site base prepended. */
  imageUrl: string;
  creatorName: string;
  /** Price in paise (DB native unit). */
  priceCents: number;
  /** Currency code. Always INR for now. */
  currency?: string;
  /** 0-5 average rating; pass 0 to skip the AggregateRating block. */
  avgRating: number;
  reviewCount: number;
  /** Total download count — used as the secondary popularity signal. */
  downloads: number;
}

/**
 * Product schema for the asset detail page. Lets Google render the
 * listing as a rich shopping card with price + currency + rating +
 * brand. Required fields per Google's Merchant guidelines: name, image,
 * offers (with price + priceCurrency + availability + url).
 */
export function buildProductSchema(input: ProductSchemaInput): Record<string, unknown> {
  const priceRupees = (input.priceCents / 100).toFixed(2);
  const url = absoluteUrl(`/explore/${input.id}`);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: input.title,
    description: clipDescription(input.description, 5000),
    image: input.imageUrl.startsWith("http")
      ? input.imageUrl
      : absoluteUrl(input.imageUrl),
    brand: {
      "@type": "Brand",
      name: input.creatorName,
    },
    url,
    offers: {
      "@type": "Offer",
      price: priceRupees,
      priceCurrency: input.currency ?? "INR",
      availability: "https://schema.org/InStock",
      url,
      // Digital products with no shipping — Google treats this as a
      // hint that it's an instant-delivery item.
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (input.reviewCount > 0 && input.avgRating > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.avgRating.toFixed(1),
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Downloads count is a popularity signal Google reads via
  // interactionStatistic. Optional — Google rendering is unchanged
  // when missing.
  if (input.downloads > 0) {
    schema.interactionStatistic = {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/DownloadAction",
      userInteractionCount: input.downloads,
    };
  }

  return schema;
}
