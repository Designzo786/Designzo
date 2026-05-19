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
  const rl = checkRateLimit(req, "asset-search", {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

  // Need at least 2 chars — single letters match almost everything.
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.asset.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
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
