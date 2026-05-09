/**
 * Mock AI 3D generation provider.
 *
 * Real-world swap path: replace `generateMock()` with a fetch to Meshy.ai,
 * Luma Genie, Tripo AI, or OpenAI Shap-E. Their APIs all return either a
 * job ID (poll for completion) or a direct GLB/FBX URL — wire whichever
 * you choose into `/api/ai/generate/route.ts`.
 */

import type { MockAssetShape } from "./mock/assets";

export type AiStyle = "realistic" | "lowpoly" | "stylized";

export interface AiGenerationResult {
  id: string;
  prompt: string;
  style: AiStyle;
  shape: MockAssetShape;
  color: string;
  title: string;
  createdAt: string;
}

// ─── Keyword heuristics ───────────────────────────────────────────────────────
// Each entry maps a list of trigger words to a target shape/color. The first
// matching keyword wins. This makes the mock feel responsive to the prompt.

const SHAPE_RULES: Array<{ keywords: string[]; shape: MockAssetShape }> = [
  { keywords: ["ring", "donut", "torus", "loop", "halo", "tire"], shape: "torus" },
  { keywords: ["knot", "twisted", "twist", "pretzel", "rope"], shape: "torusKnot" },
  { keywords: ["sphere", "ball", "orb", "planet", "moon", "bubble", "egg"], shape: "sphere" },
  { keywords: ["crystal", "gem", "diamond", "shard", "spike"], shape: "octahedron" },
  { keywords: ["box", "cube", "block", "brick", "container", "cabinet"], shape: "box" },
  { keywords: ["cone", "tree", "pyramid", "rocket", "horn", "ice cream"], shape: "cone" },
  { keywords: ["cylinder", "pillar", "pipe", "column", "bottle", "vase", "can"], shape: "cylinder" },
  { keywords: ["dodeca", "soccer", "football", "ball pattern"], shape: "dodecahedron" },
  { keywords: ["tetra", "triangle", "wedge"], shape: "tetrahedron" },
  { keywords: ["abstract", "fractal", "alien", "creature", "monster", "geometry", "geometric"], shape: "icosahedron" },
];

const COLOR_RULES: Array<{ keywords: string[]; color: string }> = [
  { keywords: ["fire", "lava", "red", "blood", "ruby", "demon"], color: "#ef4444" },
  { keywords: ["sun", "gold", "yellow", "honey", "amber"], color: "#fbbf24" },
  { keywords: ["orange", "rust", "ember", "pumpkin", "sunset"], color: "#f97316" },
  { keywords: ["pink", "rose", "candy", "bubblegum", "sakura"], color: "#ec4899" },
  { keywords: ["forest", "green", "leaf", "grass", "jungle", "moss", "emerald"], color: "#10b981" },
  { keywords: ["lime", "neon green", "acid"], color: "#84cc16" },
  { keywords: ["water", "ocean", "blue", "sky", "ice", "frost", "sapphire"], color: "#3b82f6" },
  { keywords: ["cyan", "teal", "lagoon", "tropical"], color: "#22d3ee" },
  { keywords: ["neon", "electric", "cyber", "digital", "tron", "synthwave", "violet"], color: "#a855f7" },
  { keywords: ["purple", "amethyst", "lavender", "magic", "wizard"], color: "#7c3aed" },
  { keywords: ["magenta", "fuchsia", "vapor"], color: "#d946ef" },
  { keywords: ["black", "shadow", "void", "obsidian", "carbon"], color: "#374151" },
  { keywords: ["silver", "metal", "steel", "chrome", "gray", "grey"], color: "#94a3b8" },
];

const STYLE_PALETTES: Record<AiStyle, string[]> = {
  realistic: ["#94a3b8", "#71717a", "#fbbf24", "#f97316", "#10b981"],
  lowpoly: ["#a855f7", "#ec4899", "#3b82f6", "#22d3ee", "#84cc16"],
  stylized: ["#7c3aed", "#d946ef", "#f59e0b", "#22d3ee", "#10b981"],
};

const DEFAULT_SHAPE: MockAssetShape = "icosahedron";

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function findShape(prompt: string): MockAssetShape {
  const p = prompt.toLowerCase();
  for (const rule of SHAPE_RULES) {
    if (rule.keywords.some((k) => p.includes(k))) return rule.shape;
  }
  return DEFAULT_SHAPE;
}

function findColor(prompt: string, style: AiStyle): string {
  const p = prompt.toLowerCase();
  for (const rule of COLOR_RULES) {
    if (rule.keywords.some((k) => p.includes(k))) return rule.color;
  }
  // No keyword match — pick from the style palette using prompt hash for stability
  const palette = STYLE_PALETTES[style];
  return palette[hash(p) % palette.length];
}

function deriveTitle(prompt: string): string {
  const cleaned = prompt
    .trim()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .slice(0, 5)
    .filter(Boolean);
  if (cleaned.length === 0) return "Generated asset";
  const titled = cleaned
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return titled.length > 60 ? titled.slice(0, 57) + "…" : titled;
}

export function generateMock(
  prompt: string,
  style: AiStyle
): AiGenerationResult {
  return {
    id: `gen_${hash(prompt + style + Date.now())}`,
    prompt,
    style,
    shape: findShape(prompt),
    color: findColor(prompt, style),
    title: deriveTitle(prompt),
    createdAt: new Date().toISOString(),
  };
}

export const STYLE_OPTIONS: { value: AiStyle; label: string; hint: string }[] = [
  { value: "realistic", label: "Realistic", hint: "Photoreal materials, accurate proportions" },
  { value: "lowpoly", label: "Low-poly", hint: "Faceted, stylized, game-ready geometry" },
  { value: "stylized", label: "Stylized", hint: "Hand-crafted, painterly look" },
];

export const PROMPT_EXAMPLES = [
  "A glowing neon crystal gem",
  "Stylized golden donut ring",
  "Low-poly forest tree with stylized canopy",
  "A swirling purple knot, abstract sci-fi",
  "Iridescent ocean orb with translucent material",
  "Cyber pyramid temple with tron lines",
];
