import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin";
import { deletePublic, deletePrivate } from "@/lib/storage";
import { isValidSubcategory } from "@/lib/mock/assets";

export const runtime = "nodejs";

const VALID_CATEGORIES = ["3d-models", "3d-icons", "lottie", "svg-icons"];

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

  const updated = await prisma.asset.update({
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
