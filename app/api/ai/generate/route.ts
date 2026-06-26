import { NextResponse } from "next/server";
import { generateMock, type AiStyle } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VALID_STYLES: AiStyle[] = ["realistic", "lowpoly", "stylized"];

// Simulated processing delay so the UI's "generating…" state has time to feel
// real. Real providers take 30s–3min; this stays snappy for dev.
const FAKE_DELAY_MS = 1800;

export async function POST(req: Request) {
  // 30 generations per 10 minutes per IP. Becomes critical once a real (paid)
  // provider is wired in — every call costs money.
  const rl = await checkRateLimit(req, "ai-generate", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { prompt, style } = (body ?? {}) as {
    prompt?: string;
    style?: AiStyle;
  };

  if (typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json(
      { error: "Prompt must be at least 3 characters." },
      { status: 400 }
    );
  }
  if (prompt.length > 500) {
    return NextResponse.json(
      { error: "Prompt is too long (max 500 characters)." },
      { status: 400 }
    );
  }

  const resolvedStyle: AiStyle = VALID_STYLES.includes(style as AiStyle)
    ? (style as AiStyle)
    : "stylized";

  await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));

  const result = generateMock(prompt.trim(), resolvedStyle);
  return NextResponse.json(result);
}
