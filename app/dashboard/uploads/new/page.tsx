import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { UploadForm } from "./UploadForm";

export const metadata = { title: "Upload Asset" };

export default async function UploadAssetPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/uploads/new");
  // Buy-only USER accounts can't upload — send them to their library.
  if (session.user.role === "USER") redirect("/dashboard/library");

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <Link
          href="/dashboard/uploads"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to My Assets
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Upload an asset
        </h1>
        <p className="text-sm text-muted mt-1">
          Submit a 3D model, material, or other digital asset. An admin
          will review and approve it before it appears in the marketplace.
        </p>
      </header>

      <UploadForm />
    </div>
  );
}
