import Link from "next/link";
import { ArrowRight, Wallet, Globe2, ShieldCheck, Upload } from "lucide-react";

export const metadata = {
  title: "Sell on Dezignxo",
  description:
    "Become a creator on Dezignxo — keep 80% of every sale and reach buyers worldwide.",
};

const BENEFITS = [
  {
    icon: Wallet,
    title: "Keep 80% of every sale",
    description:
      "We take a flat 20% commission — no hidden fees. Earnings are paid out to your bank via RazorpayX.",
  },
  {
    icon: Globe2,
    title: "Reach buyers worldwide",
    description:
      "Your assets appear in a marketplace browsed by studios, indie developers, and 3D artists.",
  },
  {
    icon: ShieldCheck,
    title: "Your work, protected",
    description:
      "Every download carries a clear commercial license. Files are served through secure, signed URLs.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Create a Collaborator account",
    text: "Sign up and choose the Collaborator account type — it unlocks the upload tools.",
  },
  {
    n: "2",
    title: "Upload your asset",
    text: "Add your 3D model or material with a preview image, description, and price.",
  },
  {
    n: "3",
    title: "Pass review",
    text: "Our team checks every submission for quality and licensing before it goes live.",
  },
  {
    n: "4",
    title: "Get paid",
    text: "Complete a one-time KYC, then request payouts straight to your bank account.",
  },
];

export default function SellPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <header className="text-center max-w-2xl mx-auto">
        <div className="inline-block px-3 py-1 rounded-full bg-gold-muted border border-gold/20 text-xs font-medium text-gold mb-5">
          For Creators
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-primary">
          Turn your 3D work into income
        </h1>
        <p className="mt-4 text-secondary text-base sm:text-lg leading-relaxed">
          Join Dezignxo as a Collaborator and sell your models and materials
          to creators around the world.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register?type=collaborator"
            className="group h-12 px-7 rounded-xl text-sm font-semibold text-white gradient-accent flex items-center justify-center gap-2 shadow-[0_0_32px_rgba(124,58,237,0.35)] hover:shadow-[0_0_48px_rgba(124,58,237,0.55)] transition-all"
          >
            Become a creator
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/docs/creators"
            className="h-12 px-7 rounded-xl text-sm font-semibold text-primary bg-elevated border border-border-hover flex items-center justify-center hover:border-accent transition-all"
          >
            Read the creator guide
          </Link>
        </div>
      </header>

      <div className="mt-16 grid sm:grid-cols-3 gap-5">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.title}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-elevated border border-border flex items-center justify-center text-accent-light">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-primary">
                {b.title}
              </h3>
              <p className="mt-1.5 text-sm text-secondary leading-relaxed">
                {b.description}
              </p>
            </div>
          );
        })}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-primary text-center mb-10">
          How selling works
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="w-9 h-9 rounded-lg gradient-accent text-white flex items-center justify-center text-sm font-bold">
                {s.n}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-primary">
                {s.title}
              </h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-border glass-strong p-8 sm:p-12 text-center">
        <Upload className="w-8 h-8 text-accent-light mx-auto mb-4" />
        <h2 className="text-2xl font-bold tracking-tight text-primary">
          Ready to upload your first asset?
        </h2>
        <p className="mt-2 text-secondary max-w-md mx-auto">
          It takes a few minutes to list an asset and start earning.
        </p>
        <Link
          href="/register?type=collaborator"
          className="inline-flex items-center gap-2 mt-6 h-11 px-6 rounded-xl text-sm font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.3)] hover:shadow-[0_0_36px_rgba(124,58,237,0.5)] transition-all"
        >
          Get started
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
