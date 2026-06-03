import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import {
  Star,
  Download,
  ArrowLeft,
  Tag,
  Calendar,
  FileType,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import {
  CATEGORIES,
  FILE_TYPES,
  type MockAssetShape,
} from "@/lib/mock/assets";
import {
  formatPrice,
  formatNumber,
  formatFileSize,
  formatDate,
  creatorDisplayName,
} from "@/lib/utils";
import { AssetCard, type AssetCardData } from "@/components/assets/AssetCard";
import { AssetActionButton } from "@/components/assets/AssetActionButton";
import { AssetSocialButtons } from "@/components/assets/AssetSocialButtons";
import { AssetReviews } from "./AssetReviews";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Default preview shape/color for uploads that have no preview image and
// no .glb model — keeps the 3D viewer from rendering empty.
const FALLBACK_SHAPE: MockAssetShape = "icosahedron";
const FALLBACK_COLOR = "#7c3aed";

const AssetViewer = dynamic(
  () => import("@/components/assets/AssetViewer"),
  { loading: () => <div className="absolute inset-0 skeleton" /> }
);

// Detail-page asset shape. Every asset is a real DB row.
interface UnifiedAsset {
  id: string;
  title: string;
  creatorName: string;
  creatorId: string;
  description: string;
  category: string;
  fileType: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  downloads: number;
  createdAt: Date;
  format: string;
  fileSizeBytes: number;
  price: number;
  // Preview sources, in priority order: modelUrl > shape/shapeColor > previewImage
  modelUrl?: string;
  shape?: MockAssetShape;
  shapeColor?: string;
  previewImage?: string;
}

async function loadAsset(id: string): Promise<UnifiedAsset | null> {
  const dbAsset = await prisma.asset
    .findUnique({
      where: { id },
      include: { uploader: { select: { id: true, name: true, role: true } } },
    })
    .catch(() => null);
  if (!dbAsset) return null;

  const hasModelUrl = !!dbAsset.modelKey;
  const hasPreviewImage = !!dbAsset.previewKey;

  return {
    id: dbAsset.id,
    title: dbAsset.title,
    creatorName: creatorDisplayName(
      dbAsset.uploader.name,
      dbAsset.uploader.role
    ),
    creatorId: dbAsset.uploaderId,
    description: dbAsset.description,
    category: dbAsset.category,
    fileType: dbAsset.fileType,
    tags: dbAsset.tags,
    rating: dbAsset.avgRating,
    reviewCount: dbAsset.reviewCount,
    downloads: dbAsset.downloads,
    createdAt: dbAsset.createdAt,
    format: dbAsset.fileType,
    fileSizeBytes: dbAsset.fileSizeBytes ?? 0,
    price: dbAsset.price,
    // Priority: a .glb in the viewer first, then a static preview image,
    // then a generic primitive shape so the card never goes blank.
    modelUrl: hasModelUrl ? dbAsset.modelKey ?? undefined : undefined,
    shape: !hasModelUrl && !hasPreviewImage ? FALLBACK_SHAPE : undefined,
    shapeColor: !hasModelUrl && !hasPreviewImage ? FALLBACK_COLOR : undefined,
    previewImage:
      !hasModelUrl && hasPreviewImage ? dbAsset.previewKey : undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await loadAsset(id);
  if (!asset) return { title: "Asset not found" };
  return {
    title: `${asset.title} by ${asset.creatorName}`,
    description: asset.description,
  };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // loadAsset and auth() are independent — run them in parallel
  const [asset, session] = await Promise.all([
    loadAsset(id),
    auth().catch(() => null),
  ]);
  if (!asset) notFound();

  const isFree = asset.price === 0;
  const isAdmin = session?.user.role === "ADMIN";
  const isOwner = asset.creatorId === session?.user.id;

  // Has the signed-in user already paid for / claimed this asset, and have
  // they wishlisted it? Both are independent — run in parallel.
  let hasPurchase = false;
  let initialLiked = false;
  if (session) {
    const [purchaseRow, likeRow] = await Promise.all([
      prisma.purchase
        .findFirst({
          where: {
            buyerId: session.user.id,
            assetId: asset.id,
            status: "COMPLETED",
          },
          select: { id: true },
        })
        .catch(() => null),
      prisma.assetLike
        .findUnique({
          where: {
            userId_assetId: { userId: session.user.id, assetId: asset.id },
          },
          select: { id: true },
        })
        .catch(() => null),
    ]);
    hasPurchase = !!purchaseRow;
    initialLiked = !!likeRow;
  }

  let mode: "guest-free" | "guest-buy" | "owned" | "free" | "buy";
  if (!session) mode = isFree ? "guest-free" : "guest-buy";
  else if (isOwner || isAdmin || hasPurchase) mode = "owned";
  else mode = isFree ? "free" : "buy";

  const category = CATEGORIES.find((c) => c.slug === asset.category);
  const fileTypeMeta = FILE_TYPES.find((f) => f.slug === asset.fileType);

  // Related assets — three most-downloaded APPROVED uploads in the same
  // category, excluding the current asset. Falls back to empty if the DB
  // call fails so the page never errors on this side-section.
  const relatedRows = await prisma.asset
    .findMany({
      where: {
        status: "APPROVED",
        category: asset.category,
        NOT: { id: asset.id },
      },
      orderBy: { downloads: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        price: true,
        downloads: true,
        avgRating: true,
        reviewCount: true,
        previewKey: true,
        uploader: { select: { name: true, role: true } },
      },
    })
    .catch(() => []);

  const related: AssetCardData[] = relatedRows.map((a) => ({
    id: a.id,
    title: a.title,
    creator: creatorDisplayName(a.uploader.name, a.uploader.role),
    price: a.price,
    rating: a.avgRating,
    reviewCount: a.reviewCount,
    downloads: a.downloads,
    preview: { shape: FALLBACK_SHAPE, color: FALLBACK_COLOR },
    previewImage: a.previewKey || undefined,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted mb-6 flex-wrap">
        <Link
          href="/explore"
          className="hover:text-primary inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Explore
        </Link>
        <span className="text-border">/</span>
        <Link
          href={`/explore?category=${asset.category}`}
          className="hover:text-primary transition-colors"
        >
          {category?.name ?? asset.category}
        </Link>
        <span className="text-border">/</span>
        <span className="text-secondary truncate">{asset.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        <div className="space-y-4">
          <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-elevated to-canvas">
            {asset.modelUrl ? (
              <>
                <AssetViewer
                  fileType={asset.fileType}
                  modelUrl={asset.modelUrl}
                  title={asset.title}
                />
                {/* Help-text caption only makes sense for 3D models. Lottie
                    auto-plays, SVG is static — no interaction hints needed. */}
                {asset.fileType === "MODEL_3D" && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-canvas/80 backdrop-blur text-xs text-muted border border-border whitespace-nowrap">
                    Drag to rotate · Scroll to zoom
                  </div>
                )}
              </>
            ) : asset.shape && asset.shapeColor ? (
              <>
                <AssetViewer shape={asset.shape} color={asset.shapeColor} />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-canvas/80 backdrop-blur text-xs text-muted border border-border whitespace-nowrap">
                  Drag to rotate · Scroll to zoom
                </div>
              </>
            ) : asset.previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.previewImage}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
                No preview available
              </div>
            )}
            {isFree && (
              <div className="absolute top-4 left-4 badge badge-free pointer-events-none">
                Free
              </div>
            )}
          </div>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold mb-3 text-primary">
              About this asset
            </h2>
            <p className="text-secondary leading-relaxed whitespace-pre-line">
              {asset.description}
            </p>
            <div className="mt-5 pt-5 border-t border-border grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted text-xs uppercase tracking-wide mb-1">
                  Category
                </div>
                <div className="text-primary font-medium">
                  {category?.name ?? asset.category}
                </div>
              </div>
              <div>
                <div className="text-muted text-xs uppercase tracking-wide mb-1">
                  Asset type
                </div>
                <div className="text-primary font-medium">
                  {fileTypeMeta?.name ?? asset.fileType}
                </div>
              </div>
            </div>
          </section>

          <AssetReviews
            assetId={asset.id}
            avgRating={asset.rating}
            reviewCount={asset.reviewCount}
            viewerId={session?.user.id ?? null}
            canReview={hasPurchase && !isOwner}
            isSignedIn={!!session}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">
              {asset.title}
            </h1>
            <p className="mt-2 text-secondary">
              by{" "}
              <span className="text-primary font-medium">
                {asset.creatorName}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span
                className={`text-4xl font-bold ${
                  isFree ? "text-info" : "gradient-text"
                }`}
              >
                {formatPrice(asset.price)}
              </span>
              {!isFree && (
                <span className="text-sm text-muted">INR · one-time</span>
              )}
            </div>

            <AssetActionButton mode={mode} assetId={asset.id} />

            <div className="mt-3">
              <AssetSocialButtons
                assetId={asset.id}
                assetTitle={asset.title}
                initialLiked={initialLiked}
                isAuthed={!!session}
                isReal={true}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted">
              <CheckCircle2 className="w-4 h-4 text-info shrink-0" />
              Royalty-free commercial license included
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
            {asset.rating > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  Rating
                </span>
                <span className="text-primary font-medium">
                  {asset.rating.toFixed(1)} / 5.0
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted">
                <Download className="w-4 h-4" />
                Downloads
              </span>
              <span className="text-primary font-medium">
                {formatNumber(asset.downloads)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted">
                <Calendar className="w-4 h-4" />
                Published
              </span>
              <span className="text-primary font-medium">
                {formatDate(asset.createdAt)}
              </span>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-muted">
                <FileType className="w-4 h-4" />
                Format
              </span>
              <span className="text-primary font-mono text-xs">
                {asset.format}
              </span>
            </div>
            {asset.fileSizeBytes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted">
                  <HardDrive className="w-4 h-4" />
                  File size
                </span>
                <span className="text-primary font-medium">
                  {formatFileSize(asset.fileSizeBytes)}
                </span>
              </div>
            )}
          </div>

          {asset.tags.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2 text-primary">
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {asset.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/explore?q=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 rounded-full text-xs bg-elevated border border-border text-secondary hover:border-accent/40 hover:text-accent-light transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                More from {category?.name ?? "the marketplace"}
              </h2>
              <p className="text-secondary text-sm mt-1">
                Discover similar assets you might like
              </p>
            </div>
            <Link
              href={`/explore?category=${asset.category}`}
              className="text-sm text-accent-light hover:text-accent inline-flex items-center gap-1 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
