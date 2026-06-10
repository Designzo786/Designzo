import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditAssetForm } from "./EditAssetForm";

export const metadata = { title: "Edit asset" };

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      subcategory: true,
      price: true,
      tags: true,
      status: true,
      rejectionNote: true,
      uploaderId: true,
    },
  });

  if (!asset) notFound();

  // Owner or admin only — server guard mirrors what the PATCH handler
  // will enforce, so a deep-linked /edit URL from a wrong account gets a
  // 404 instead of leaking that the asset exists.
  const isOwner = asset.uploaderId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard/uploads"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to My Assets
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Edit asset
        </h1>
        <p className="text-sm text-muted mt-1">
          Update the title, description, category, price, or tags. The asset
          file itself is locked — delete and re-upload to swap the source.
        </p>
      </header>

      <EditAssetForm
        asset={{
          id: asset.id,
          title: asset.title,
          description: asset.description,
          category: asset.category,
          subcategory: asset.subcategory,
          price: asset.price,
          tags: asset.tags,
          status: asset.status,
          rejectionNote: asset.rejectionNote,
        }}
      />
    </div>
  );
}
