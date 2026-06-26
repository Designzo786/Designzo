import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Lightweight type-ahead search for the navbar search bar.
 * Returns up to 6 APPROVED assets matching the query by title or tag,
 * ordered by popularity. Public — no auth needed (Explore is public too).
 */
export async function GET(req: Request) {
  // Generous ceiling — debounced typing fires a handful of requests per
  // search; this only blocks genuine abuse.
  const rl = await checkRateLimit(req, "asset-search", {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

  // Search starts at the first character typed.
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  // `mode: "insensitive"` makes Postgres use ILIKE, so capitalisation never
  // matters. Tags are stored normalised to lowercase at upload time, so a
  // simple `has` with `q.toLowerCase()` matches case-insensitively too.
  const needle = q.toLowerCase();
  const results = await prisma.asset.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { has: needle } },
      ],
    },
    orderBy: { downloads: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      price: true,
      category: true,
      previewKey: true,
    },
  });

  return NextResponse.json({ results });
}
