import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin";
import { deletePublic, deletePrivate } from "@/lib/storage";
import {
  r2Head,
  r2GetRange,
  r2Copy,
  r2Delete,
  r2PublicUrl,
} from "@/lib/r2";
import {
  validateAssetFile,
  validateModelPng,
  validateModelBlend,
  getExtension,
} from "@/lib/upload-validation";
import { isValidSubcategory } from "@/lib/mock/assets";
import type { FileType } from "@prisma/client";

export const runtime = "nodejs";

const VALID_CATEGORIES = ["3d-models", "3d-icons", "lottie", "svg-icons"];

// Mirror the ceilings the commit + upload-url routes use so pack-edit
// can re-validate the same way.
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_MODEL_PNG_BYTES = 8 * 1024 * 1024;
const MAX_MODEL_BLEND_BYTES = 50 * 1024 * 1024;
const VALIDATION_BYTE_RANGE = 256 * 1024 - 1;
const MAX_PACK_ITEMS_TOTAL = 60;

/**
 * Patch an asset's editable metadata.
 *
 *   • Allowed for the uploader themselves, or for any ADMIN.
 *   • Editable fields: title, description, price, category, subcategory, tags.
 *   • Files (preview / source / companions) are NOT editable here — the
 *     creator deletes + re-uploads if they need to swap the actual asset.
 *   • Status transitions:
 *       PENDING  → stays PENDING (still in queue).
 *       REJECTED → re-enters PENDING and rejectionNote is cleared so the
 *                  admin sees a fresh row to review.
 *       APPROVED → stays APPROVED (already vetted; metadata edits are
 *                  small enough that they don't require re-review).
 *   • Cache invalidation matches DELETE so the explore + detail pages
 *     reflect the edit on the next request.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      uploaderId: true,
      status: true,
      category: true,
      fileType: true,
      packItems: {
        select: {
          id: true,
          fileKey: true,
          modelKey: true,
          pngKey: true,
          pngUrl: true,
          blendKey: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const isOwner = existing.uploaderId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You can only edit your own assets." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const category = String(body.category ?? "").trim();
  const subcategoryRaw = String(body.subcategory ?? "").trim();
  const subcategory = subcategoryRaw.length > 0 ? subcategoryRaw : null;
  const tagsInput = body.tags;
  const priceRaw = body.price;

  if (title.length < 3 || title.length > 100) {
    return NextResponse.json(
      { error: "Title must be 3–100 characters." },
      { status: 400 }
    );
  }
  if (description.length < 10 || description.length > 2000) {
    return NextResponse.json(
      { error: "Description must be 10–2000 characters." },
      { status: 400 }
    );
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!isValidSubcategory(category, subcategory)) {
    return NextResponse.json(
      {
        error:
          "Invalid sub-category for the chosen category. Pick one of the available options or leave it blank.",
      },
      { status: 400 }
    );
  }

  // Tags: accept either a CSV string (same wire format as upload) or a
  // pre-split array. Normalise → trimmed, lowercased, deduped, capped at 10.
  const rawTagList = Array.isArray(tagsInput)
    ? tagsInput.map((t) => String(t))
    : String(tagsInput ?? "").split(",");
  const tags = Array.from(
    new Set(
      rawTagList
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 2 && t.length <= 30)
    )
  ).slice(0, 10);

  const price = Number(priceRaw);
  if (!Number.isInteger(price) || price < 0 || price > 999999) {
    return NextResponse.json(
      { error: "Price must be a whole number of paise (0–999999)." },
      { status: 400 }
    );
  }
  if (price > 0 && price < 100) {
    return NextResponse.json(
      { error: "Price must be either 0 (free) or at least ₹1 (100 paise)." },
      { status: 400 }
    );
  }

  // ── Pack-edit support (icon-pack listings only) ──────────────────────
  // The form sends two arrays:
  //   packRemove      — AssetPackItem ids to drop from the pack.
  //   packAdd         — newly-uploaded items to append. Each carries the
  //                     R2 keys the browser already PUT via signed URL,
  //                     same shape as POST /api/assets accepts.
  // Both are validated + applied below. If the listing isn't already a
  // pack, the requests are rejected (creator can promote a single
  // listing to a pack by delete + re-upload, not by patch).
  const packRemoveRaw = body.packRemove;
  const packAddRaw = body.packAdd;
  const isPackEdit =
    Array.isArray(packRemoveRaw) || Array.isArray(packAddRaw);

  const packRemove = Array.isArray(packRemoveRaw)
    ? packRemoveRaw.filter((x): x is string => typeof x === "string")
    : [];
  type PackAddInput = {
    name?: string;
    fileKey?: string;
    pngKey?: string;
    blendKey?: string;
  };
  const packAdd: PackAddInput[] = Array.isArray(packAddRaw)
    ? (packAddRaw as PackAddInput[]).filter(
        (x) => x && typeof x === "object"
      )
    : [];

  if (isPackEdit && existing.packItems.length === 0) {
    return NextResponse.json(
      {
        error:
          "This listing isn't a pack — add/remove items doesn't apply. To convert a single listing into a pack, delete and re-upload.",
      },
      { status: 400 }
    );
  }

  // Resulting pack size has to stay in bounds + non-empty (a pack with
  // zero items would orphan the listing's cover key).
  const remainingAfter =
    existing.packItems.length - packRemove.length + packAdd.length;
  if (isPackEdit && remainingAfter < 1) {
    return NextResponse.json(
      { error: "A pack must keep at least one item." },
      { status: 400 }
    );
  }
  if (isPackEdit && remainingAfter > MAX_PACK_ITEMS_TOTAL) {
    return NextResponse.json(
      {
        error: `Pack would exceed the ${MAX_PACK_ITEMS_TOTAL}-item ceiling.`,
      },
      { status: 400 }
    );
  }

  // Every packRemove id MUST actually belong to this listing — protects
  // against a tampered client deleting somebody else's pack items.
  const existingItemMap = new Map(
    existing.packItems.map((it) => [it.id, it])
  );
  for (const rmId of packRemove) {
    if (!existingItemMap.has(rmId)) {
      return NextResponse.json(
        { error: "One of the packRemove ids isn't part of this listing." },
        { status: 400 }
      );
    }
  }

  // packAdd keys must all live under the user's R2 prefix.
  const userPathToken = `/${session.user.id}/`;
  for (const item of packAdd) {
    for (const k of [item.fileKey, item.pngKey, item.blendKey]) {
      if (k && !k.includes(userPathToken)) {
        return NextResponse.json(
          {
            error:
              "One of the new pack item keys doesn't belong to this account.",
          },
          { status: 403 }
        );
      }
    }
  }

  // Compute the displayOrder offset so new items sit after the
  // surviving ones in render order.
  const nextDisplayOrder = existing.packItems.length;
  const newRowData: Array<{
    name: string;
    fileKey: string;
    modelKey: string;
    pngKey: string | null;
    pngUrl: string | null;
    blendKey: string | null;
    displayOrder: number;
    fileSizeBytes: number;
  }> = [];

  // Track every R2 object we copy/touch so a mid-batch validation
  // failure can roll the bucket back without leaving orphans.
  const newR2Keys: string[] = [];

  if (packAdd.length > 0) {
    if (existing.fileType !== ("MODEL_3D" as FileType)) {
      return NextResponse.json(
        { error: "Pack items are only valid for 3D model listings." },
        { status: 400 }
      );
    }

    for (let i = 0; i < packAdd.length; i++) {
      const item = packAdd[i];
      if (!item.fileKey) {
        return NextResponse.json(
          { error: `New pack item ${i + 1} is missing its uploaded fileKey.` },
          { status: 400 }
        );
      }

      const head = await r2Head(item.fileKey);
      if (!head) {
        return NextResponse.json(
          { error: `New pack item ${i + 1} upload didn't land in storage.` },
          { status: 400 }
        );
      }
      if (head.contentLength > MAX_FILE_BYTES) {
        newR2Keys.push(item.fileKey);
        for (const k of newR2Keys) await r2Delete(k).catch(() => {});
        return NextResponse.json(
          { error: `New pack item ${i + 1} exceeds 100 MB limit.` },
          { status: 400 }
        );
      }
      newR2Keys.push(item.fileKey);

      const bytes = await r2GetRange(
        item.fileKey,
        0,
        Math.min(VALIDATION_BYTE_RANGE, head.contentLength - 1)
      );
      const ext = getExtension(item.fileKey);
      const v = validateAssetFile(
        `pack-item-${i + 1}.${ext}`,
        existing.fileType,
        bytes
      );
      if (!v.ok) {
        for (const k of newR2Keys) await r2Delete(k).catch(() => {});
        return NextResponse.json(
          { error: `New pack item ${i + 1}: ${v.error}` },
          { status: 400 }
        );
      }

      const publicKey = item.fileKey.replace(
        /^private\/files\//,
        "public/models/"
      );
      await r2Copy(item.fileKey, publicKey);
      newR2Keys.push(publicKey);

      // Optional PNG companion.
      let resolvedPngKey: string | null = null;
      let resolvedPngUrl: string | null = null;
      if (item.pngKey) {
        const pngHead = await r2Head(item.pngKey);
        if (
          !pngHead ||
          pngHead.contentLength > MAX_MODEL_PNG_BYTES
        ) {
          for (const k of newR2Keys) await r2Delete(k).catch(() => {});
          return NextResponse.json(
            { error: `New pack item ${i + 1}'s PNG was invalid.` },
            { status: 400 }
          );
        }
        newR2Keys.push(item.pngKey);
        const pngBytes = await r2GetRange(
          item.pngKey,
          0,
          Math.min(VALIDATION_BYTE_RANGE, pngHead.contentLength - 1)
        );
        const pngCheck = validateModelPng(item.pngKey, pngBytes);
        if (!pngCheck.ok) {
          for (const k of newR2Keys) await r2Delete(k).catch(() => {});
          return NextResponse.json(
            { error: `New pack item ${i + 1} PNG: ${pngCheck.error}` },
            { status: 400 }
          );
        }
        resolvedPngKey = item.pngKey;
        resolvedPngUrl = r2PublicUrl(item.pngKey);
      }

      // Optional Blender companion.
      let resolvedBlendKey: string | null = null;
      if (item.blendKey) {
        const blendHead = await r2Head(item.blendKey);
        if (
          !blendHead ||
          blendHead.contentLength > MAX_MODEL_BLEND_BYTES
        ) {
          for (const k of newR2Keys) await r2Delete(k).catch(() => {});
          return NextResponse.json(
            { error: `New pack item ${i + 1}'s .blend was invalid.` },
            { status: 400 }
          );
        }
        newR2Keys.push(item.blendKey);
        const blendBytes = await r2GetRange(
          item.blendKey,
          0,
          Math.min(VALIDATION_BYTE_RANGE, blendHead.contentLength - 1)
        );
        const blendCheck = validateModelBlend(item.blendKey, blendBytes);
        if (!blendCheck.ok) {
          for (const k of newR2Keys) await r2Delete(k).catch(() => {});
          return NextResponse.json(
            { error: `New pack item ${i + 1} .blend: ${blendCheck.error}` },
            { status: 400 }
          );
        }
        resolvedBlendKey = item.blendKey;
      }

      const fallbackName = item.fileKey
        .split("/")
        .pop()!
        .replace(/^[a-f0-9]{16}-/, "")
        .replace(/\.[^.]+$/, "");
      const itemName =
        (typeof item.name === "string" ? item.name.trim() : "") ||
        fallbackName ||
        `Item ${nextDisplayOrder + i + 1}`;

      newRowData.push({
        name: itemName.slice(0, 100),
        fileKey: item.fileKey,
        modelKey: r2PublicUrl(publicKey),
        pngKey: resolvedPngKey,
        pngUrl: resolvedPngUrl,
        blendKey: resolvedBlendKey,
        displayOrder: nextDisplayOrder + i,
        fileSizeBytes: head.contentLength,
      });
    }
  }

  // REJECTED or NEEDS_IMPROVEMENT → PENDING resubmission, since saving
  // an edit is the creator's signal that they've acted on the admin's
  // note. PENDING and APPROVED keep their current status. rejectionNote
  // clears on any successful edit so the moderation list always
  // reflects the latest state.
  const nextStatus =
    existing.status === "REJECTED" ||
    existing.status === "NEEDS_IMPROVEMENT"
      ? "PENDING"
      : existing.status;

  // Run the metadata update + pack mutations in one transaction so
  // either everything commits or nothing does.
  const updated = await prisma.$transaction(async (tx) => {
    const updatedRow = await tx.asset.update({
      where: { id },
      data: {
        title,
        description,
        category,
        subcategory,
        tags,
        price,
        status: nextStatus,
        rejectionNote: null,
      },
      select: { id: true, status: true },
    });

    if (packRemove.length > 0) {
      await tx.assetPackItem.deleteMany({
        where: { id: { in: packRemove }, assetId: id },
      });
    }

    if (newRowData.length > 0) {
      await tx.assetPackItem.createMany({
        data: newRowData.map((r) => ({ ...r, assetId: id })),
      });
    }

    return updatedRow;
  });

  // Now that the DB write succeeded, GC the R2 blobs that backed the
  // removed pack items. Failures are non-fatal — they leave orphan
  // bytes in the bucket but never corrupt the DB.
  for (const rmId of packRemove) {
    const it = existingItemMap.get(rmId);
    if (!it) continue;
    await deletePrivate(it.fileKey).catch(() => {});
    await deletePublic(it.modelKey).catch(() => {});
    if (it.pngUrl) await deletePublic(it.pngUrl).catch(() => {});
    if (it.blendKey) await deletePrivate(it.blendKey).catch(() => {});
  }

  if (isAdmin && !isOwner) {
    await writeAdminLog({
      adminId: session.user.id,
      action: "EDIT_ASSET",
      targetId: id,
      targetType: "ASSET",
      note: `Edited "${title}"`,
    });
  }

  revalidateTag("assets", { expire: 0 });
  revalidateTag(`assets:${existing.category}`, { expire: 0 });
  if (category !== existing.category) {
    revalidateTag(`assets:${category}`, { expire: 0 });
  }
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath(`/explore/${id}`);
  revalidatePath("/dashboard/uploads");

  return NextResponse.json({ ok: true, status: updated.status });
}

/**
 * Hard-delete an asset.
 *
 *   • Allowed for the uploader themselves, or for any ADMIN.
 *   • REFUSED if the asset has any COMPLETED purchases — those buyers
 *     paid for ongoing download access; admins who need to remove a
 *     purchased asset should set it to REJECTED via the moderation route
 *     instead (that hides it from the marketplace without destroying
 *     existing buyers' library entries).
 *   • Storage objects (preview, optional public model, private file) are
 *     deleted on a best-effort basis BEFORE the DB row, so a failure mid-way
 *     leaves an orphan blob (cheap to clean up) rather than a dead DB row
 *     pointing at a deleted file. Related rows (AssetLike, Review) cascade
 *     via the schema.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      uploaderId: true,
      previewKey: true,
      modelKey: true,
      fileKey: true,
      lottieGifKey: true,
      lottieMp4Key: true,
      modelFbxKey: true,
      modelObjKey: true,
      modelUsdzKey: true,
      modelBlendKey: true,
      modelPngKey: true,
      packItems: {
        select: {
          fileKey: true,
          modelKey: true,
          pngKey: true,
          pngUrl: true,
          blendKey: true,
        },
      },
      _count: {
        select: {
          purchases: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const isOwner = asset.uploaderId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You can only delete your own assets." },
      { status: 403 }
    );
  }

  if (asset._count.purchases > 0) {
    return NextResponse.json(
      {
        error:
          "This asset has been purchased and can't be deleted. Reject it from the moderation queue instead to hide it from the marketplace.",
      },
      { status: 409 }
    );
  }

  // Wipe storage before the DB row. If any of these fail the helpers swallow
  // the error (best-effort) — leaking a few KB of orphan storage is preferable
  // to a half-deleted record that the UI then can't reach.
  if (asset.previewKey) await deletePublic(asset.previewKey);
  if (asset.modelKey) await deletePublic(asset.modelKey);
  if (asset.fileKey) await deletePrivate(asset.fileKey);
  if (asset.lottieGifKey) await deletePrivate(asset.lottieGifKey);
  if (asset.lottieMp4Key) await deletePrivate(asset.lottieMp4Key);
  if (asset.modelFbxKey) await deletePrivate(asset.modelFbxKey);
  if (asset.modelObjKey) await deletePrivate(asset.modelObjKey);
  if (asset.modelUsdzKey) await deletePrivate(asset.modelUsdzKey);
  if (asset.modelBlendKey) await deletePrivate(asset.modelBlendKey);
  if (asset.modelPngKey) await deletePrivate(asset.modelPngKey);
  // Pack items: each carries a private .glb + a public viewer copy,
  // plus optional .png (public thumb) + .blend (private source). The
  // AssetPackItem rows themselves cascade via the schema FK; only the
  // R2 blobs need explicit cleanup.
  for (const item of asset.packItems) {
    await deletePrivate(item.fileKey);
    await deletePublic(item.modelKey);
    if (item.pngUrl) await deletePublic(item.pngUrl);
    if (item.blendKey) await deletePrivate(item.blendKey);
  }

  try {
    await prisma.asset.delete({ where: { id } });
  } catch (err) {
    // FK violation (P2003) catches the race where a purchase completes between
    // our count check and the delete — return the same 409 the upfront check
    // would have, so the client sees one consistent error.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Asset was just purchased — it can no longer be deleted. Reject it from the moderation queue instead.",
        },
        { status: 409 }
      );
    }
    throw err;
  }

  // Admin removing somebody else's asset is an auditable action.
  if (isAdmin && !isOwner) {
    await writeAdminLog({
      adminId: session.user.id,
      action: "DELETE_ASSET",
      targetId: asset.id,
      targetType: "ASSET",
      note: `Deleted "${asset.title}"`,
    });
  }

  // Belt-and-suspenders invalidation. The tag bust covers any cached query
  // that opted into ["assets"] (Showcase + Categories on the home page,
  // Explore listing). The path busts then force-rerender for the home and
  // listing routes directly, in case a stale ISR entry would otherwise be
  // served once more before the tag invalidation takes effect. The detail
  // path bust ensures the now-deleted asset's page returns notFound on the
  // very next request instead of serving a cached snapshot of the gone row.
  revalidateTag("assets", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath(`/explore/${id}`);

  return NextResponse.json({ ok: true });
}
