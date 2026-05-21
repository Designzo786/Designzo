"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Mail, MessageCircle, BookOpen, ArrowRight, Clock } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What's included with each purchase?",
    a: "Every asset comes with the original source files (GLTF, FBX, BLEND, PNG, EXR, etc. depending on the asset), a royalty-free commercial license, and a permanent license key tied to your account. Re-download anytime from your library — no expiration.",
  },
  {
    q: "Can I use assets in commercial projects?",
    a: "Yes. The standard license included with every purchase covers unlimited personal and commercial use — games, films, marketing, NFTs, and client work. The only thing you can't do is resell or redistribute the raw asset.",
  },
  {
    q: "How much does it cost to become a creator?",
    a: "Zero. Sign up free, upload your work, and we review it within 24 hours. There are no monthly fees, no upload limits, no exclusivity contracts. You keep 80% of every sale.",
  },
  {
    q: "When and how do I get paid as a creator?",
    a: "Earnings accumulate in your dashboard balance. Once you hit ₹500, you can request a bank payout via RazorpayX — typically processed within 1-3 business days. KYC verification is required before your first payout.",
  },
  {
    q: "What file formats do you support?",
    a: "3D models: GLTF, GLB, FBX, OBJ, BLEND, USDZ. Materials: standard PBR map sets. If your format isn't listed, contact us and we'll consider adding it.",
  },
  {
    q: "Are downloads time-limited?",
    a: "No. Once you own an asset, it stays in your library forever. Download as many times as you want, on as many devices as you need.",
  },
  {
    q: "What if I'm unhappy with an asset?",
    a: "We offer a 14-day refund window for assets that are technically broken, mislabeled, or significantly different from their listing. Refunds for changed minds are decided case-by-case to keep creators protected from abuse.",
  },
  {
    q: "Do you accept AI-generated assets?",
    a: "Yes, with disclosure. AI-generated work must be tagged as such, and you must own the rights to the inputs (no scraped training data, no copyrighted likenesses). We reject any AI uploads that we can't verify the provenance of.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      {/* Header — matches the visual rhythm of other home-page sections */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-xs font-medium text-accent-light mb-4">
          FAQ
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-secondary">
          Can&apos;t find the answer? Email{" "}
          <a
            href="mailto:hello@gamechanger.example"
            className="text-accent-light hover:text-accent underline underline-offset-2"
          >
            hello@gamechanger.example
          </a>
          .
        </p>
      </div>

      {/* Two-column: FAQ on the left, support card on the right */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-10 items-start">
        {/* FAQ accordion */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="divide-y divide-border">
            {FAQ_ITEMS.map((item, i) => {
              const open = openIndex === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    aria-expanded={open ? "true" : "false"}
                    aria-controls={`faq-panel-${i}`}
                    className="group w-full flex items-start gap-5 text-left px-6 sm:px-7 py-5 hover:bg-elevated/40 transition-colors"
                  >
                    <span className="flex-1 min-w-0 text-base sm:text-[17px] font-semibold text-primary leading-relaxed pt-px">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className={`shrink-0 w-7 h-7 mt-0.5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        open
                          ? "bg-accent-muted border-accent/40 text-accent-light rotate-45"
                          : "border-border text-muted group-hover:text-secondary group-hover:border-border-hover"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    className={`grid transition-all duration-300 ease-out ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm sm:text-[15px] text-secondary leading-relaxed px-6 sm:px-7 pb-5 pr-12 sm:pr-16">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support sidebar — sticks to top while scrolling FAQ on large screens */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          {/* Primary support card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
            <div
              aria-hidden
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/15 blur-3xl pointer-events-none"
            />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex -space-x-2">
                  {["#7c3aed", "#a855f7", "#f59e0b"].map((c) => (
                    <div
                      key={c}
                      className="w-9 h-9 rounded-full border-2 border-surface"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-info-muted text-[11px] font-medium text-info">
                  <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
                  Online now
                </div>
              </div>

              <h3 className="text-lg font-semibold text-primary">
                Still have questions?
              </h3>
              <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                Our team replies fast. Most messages get a personal response
                within a few hours.
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Avg reply <span className="text-primary">&lt; 4 hours</span>
                </span>
              </div>

              <a
                href="mailto:hello@gamechanger.example"
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.35)] hover:shadow-[0_0_32px_rgba(124,58,237,0.55)] transition-all"
              >
                <Mail className="w-4 h-4" />
                Email support
                <ArrowRight className="w-4 h-4 ml-auto transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          {/* Helpful resources */}
          <div className="rounded-2xl border border-border bg-surface p-2">
            <SidebarLink
              icon={BookOpen}
              title="Browse docs"
              subtitle="Guides for creators & buyers"
              href="/docs"
            />
            <SidebarLink
              icon={MessageCircle}
              title="Join our Discord"
              subtitle="Chat with creators & the team"
              href="https://discord.gg/"
              external
            />
          </div>

          {/* Creator split — a real platform term, not a usage metric */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-accent-muted/40 to-surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">
              Creator earnings
            </div>
            <div className="text-3xl font-bold gradient-text-hero">
              Keep 80%
            </div>
            <div className="mt-1 text-xs text-secondary">
              of every sale — paid to your bank via RazorpayX
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SidebarLink({
  icon: Icon,
  title,
  subtitle,
  href,
  external,
}: {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
}) {
  const inner = (
    <span className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-elevated transition-colors">
      <span className="w-10 h-10 rounded-lg bg-elevated border border-border flex items-center justify-center text-accent-light shrink-0 group-hover:border-accent/40 transition-colors">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-primary">
          {title}
        </span>
        <span className="block text-xs text-muted truncate">{subtitle}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </span>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
