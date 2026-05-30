import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/admin";
import { deletePublic, deletePrivate } from "@/lib/storage";

export const runtime = "nodejs";

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
