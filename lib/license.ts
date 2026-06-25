import type { LicenseType } from "@prisma/client";

/**
 * Renders the LICENSE.txt that ships inside every Lottie bundle ZIP
 * (and is available as a separate file for non-Lottie assets too).
 *
 * Dezignxo issues a **perpetual, royalty-free, non-exclusive** license
 * scoped per asset and per buyer. The exact text below is the legal
 * proof a buyer can attach to a usage audit — keep it verbatim unless
 * the marketplace's terms are updated, and bump the version footer at
 * the bottom if you change anything material.
 */
export interface LicenseInput {
  assetId: string;
  assetTitle: string;
  creatorName: string;
  buyerName: string;
  buyerEmail: string;
  purchaseLicenseKey: string;
  purchasedAt: Date;
  // Total paid in INR paise (0 for free assets).
  amountPaise: number;
  licenseType: LicenseType;
}

function inrFormat(paise: number): string {
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toFixed(2)}`;
}

function isoDate(d: Date): string {
  // YYYY-MM-DD — explicit so it's unambiguous in any locale.
  return d.toISOString().slice(0, 10);
}

const TYPE_SCOPE: Record<LicenseType, { name: string; allowed: string[] }> = {
  STANDARD: {
    name: "Standard License",
    allowed: [
      "Use in personal and commercial projects (websites, apps, social media,",
      "  marketing, presentations, documentation).",
      "Embed in client deliverables (e.g. one website, one mobile app, one",
      "  brand-identity deliverable).",
      "Modify the file (colours, timing, layers) to fit the project.",
      "Distribute the rendered/exported output of your project (you may NOT",
      "  redistribute the source files themselves).",
    ],
  },
  EXTENDED: {
    name: "Extended License",
    allowed: [
      "Everything in the Standard License, plus:",
      "Use in unlimited end-products distributed to end-users (templates,",
      "  themes, SaaS apps, game titles, on-demand merchandise).",
      "Sublicense as part of a larger derivative product you sell.",
      "  (You may NOT resell or redistribute the source asset standalone.)",
    ],
  },
};

export function renderLicenseText(input: LicenseInput): string {
  const scope = TYPE_SCOPE[input.licenseType];
  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push("================================================================");
  lines.push("                      DEZIGNXO ASSET LICENSE");
  lines.push("================================================================");
  lines.push("");
  lines.push(`This file certifies the license granted by Dezignxo to`);
  lines.push(`the named buyer for the asset described below.`);
  lines.push("");

  // ── Asset ─────────────────────────────────────────────────────────────────
  lines.push("--- ASSET ------------------------------------------------------");
  lines.push(`  Title       : ${input.assetTitle}`);
  lines.push(`  Asset ID    : ${input.assetId}`);
  lines.push(`  Creator     : ${input.creatorName}`);
  lines.push("");

  // ── Buyer ─────────────────────────────────────────────────────────────────
  lines.push("--- BUYER ------------------------------------------------------");
  lines.push(`  Name        : ${input.buyerName}`);
  lines.push(`  Email       : ${input.buyerEmail}`);
  lines.push(`  License key : ${input.purchaseLicenseKey}`);
  lines.push(`  Purchased   : ${isoDate(input.purchasedAt)}`);
  lines.push(`  Amount paid : ${inrFormat(input.amountPaise)} (INR)`);
  lines.push("");

  // ── License terms ─────────────────────────────────────────────────────────
  lines.push("--- LICENSE ----------------------------------------------------");
  lines.push(`  Type        : ${scope.name}`);
  lines.push(`  Duration    : Perpetual (does not expire)`);
  lines.push(`  Exclusivity : Non-exclusive`);
  lines.push(`  Royalties   : None — royalty-free for the scope below`);
  lines.push("");
  lines.push("  YOU MAY:");
  for (const line of scope.allowed) {
    lines.push(`    • ${line}`);
  }
  lines.push("");
  lines.push("  YOU MAY NOT:");
  lines.push(
    "    • Redistribute the source files (.json / .lottie / .gif / .mp4 /"
  );
  lines.push("      .glb / .svg, etc.) on any marketplace, repository, or as");
  lines.push("      a standalone download.");
  lines.push("    • Claim ownership or authorship of the asset.");
  lines.push("    • Use the asset to train machine-learning or generative-AI");
  lines.push("      models without explicit written permission from the creator.");
  lines.push("    • Use the asset in contexts that defame, harass, or violate");
  lines.push("      the rights of any person, group, or entity.");
  lines.push("");

  // ── Verification ──────────────────────────────────────────────────────────
  lines.push("--- VERIFICATION -----------------------------------------------");
  lines.push("  This license can be verified by the creator or Dezignxo");
  lines.push("  support using the license key above. Keep this file with");
  lines.push("  your project records.");
  lines.push("");
  lines.push("  Support : https://dezignxo.com/contact");
  lines.push("");

  // ── Footer ────────────────────────────────────────────────────────────────
  lines.push("================================================================");
  lines.push(`Generated ${isoDate(new Date())} · Dezignxo license v1.0`);
  lines.push("================================================================");
  lines.push("");

  // CRLF line endings — friendlier when buyers open the file in Notepad on
  // Windows. Most other editors render \n and \r\n identically.
  return lines.join("\r\n");
}
