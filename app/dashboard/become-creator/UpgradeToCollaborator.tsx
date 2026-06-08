"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  DollarSign,
  ShieldCheck,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { formatFileSize } from "@/lib/utils";
import type { CreatorStatus } from "@prisma/client";

interface Props {
  initialStatus: CreatorStatus;
  decidedAt: Date | null;
}

const BENEFITS = [
  {
    icon: Upload,
    title: "Upload unlimited assets",
    body: "Publish 3D models, materials, and packs to the public marketplace.",
  },
  {
    icon: DollarSign,
    title: "Earn from every sale",
    body: "You keep the majority — the platform takes a small commission. Payouts settle to your bank.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Creator badge",
    body: "Once your KYC clears, buyers see a verified mark on your profile and listings.",
  },
];

const MIN_DEMO_NOTE = 50;
const MAX_DEMO_NOTE = 2000;
const MAX_SAMPLE_BYTES = 5 * 1024 * 1024;
const MAX_SAMPLES = 3;
const PREVIEW_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

interface SampleSlot {
  file: File;
  previewUrl: string;
}

function getExtension(name: string): string {
  const dot = name.toLowerCase().lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function UpgradeToCollaborator({ initialStatus, decidedAt }: Props) {
  const router = useRouter();
  const [status] = useState<CreatorStatus>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { confirm, dialog } = useConfirm();

  // ── Form state ─────────────────────────────────────────────────────
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [demoNote, setDemoNote] = useState("");
  const [samples, setSamples] = useState<SampleSlot[]>([]);
  const sampleInputRef = useRef<HTMLInputElement>(null);

  const noteOk =
    demoNote.trim().length >= MIN_DEMO_NOTE &&
    demoNote.trim().length <= MAX_DEMO_NOTE;
  const canSubmit = noteOk && !submitting;

  const showForm = status === "NONE" || status === "REJECTED";

  function addSample(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const next = [...samples];
    for (const f of files) {
      if (next.length >= MAX_SAMPLES) break;
      const ext = getExtension(f.name);
      if (!PREVIEW_EXTENSIONS.includes(ext)) {
        setError(`"${f.name}" isn't a supported image. Use PNG, JPG, or WebP.`);
        continue;
      }
      if (f.size > MAX_SAMPLE_BYTES) {
        setError(
          `"${f.name}" is too large (max ${formatFileSize(MAX_SAMPLE_BYTES)}).`
        );
        continue;
      }
      next.push({ file: f, previewUrl: URL.createObjectURL(f) });
      setError(null);
    }
    setSamples(next);
    if (sampleInputRef.current) sampleInputRef.current.value = "";
  }

  function removeSample(idx: number) {
    const slot = samples[idx];
    if (slot) URL.revokeObjectURL(slot.previewUrl);
    setSamples(samples.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const ok = await confirm({
      variant: "info",
      title: "Submit application?",
      body: "Admins will review your portfolio + samples and decide within one business day. You'll get a notification with the result.",
      confirmLabel: "Send application",
    });
    if (!ok) return;

    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("portfolioUrl", portfolioUrl);
      fd.append("demoNote", demoNote.trim());
      samples.forEach((s, i) => fd.append(`sample${i}`, s.file));

      const res = await fetch("/api/account/upgrade-to-collaborator", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not submit your application.");
        setSubmitting(false);
        return;
      }
      // Success — let the page refresh pick up the new PENDING status.
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* ── Status banners ─────────────────────────────────────────── */}
        {status === "PENDING" && (
          <Alert variant="warning" title="Application under review" icon={Clock}>
            An admin is reviewing your portfolio. You&apos;ll get a notification
            the moment a decision is made
            {decidedAt ? ` — submitted ${decidedAt.toLocaleDateString()}.` : "."}
          </Alert>
        )}
        {status === "REJECTED" && (
          <Alert
            variant="danger"
            title="Application not approved"
            icon={AlertCircle}
          >
            Your last application was declined. Submit a stronger portfolio
            link, a more detailed bio, and 2-3 sample renders below to improve
            the outcome.
          </Alert>
        )}

        {error && (
          <Alert variant="danger" title="Something went wrong">
            {error}
          </Alert>
        )}

        {/* ── Benefits card ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/30 flex items-center justify-center text-accent-light shrink-0 shadow-[0_0_24px_-6px_rgba(124,58,237,0.5)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-primary">
                Collaborator account
              </h2>
              <p className="text-xs text-muted leading-relaxed mt-1">
                Tell us a bit about your work and attach a couple of samples —
                admins approve based on actual portfolio evidence. You can keep
                browsing as a buyer while you wait.
              </p>

              <ul className="mt-5 space-y-3">
                {BENEFITS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <li key={b.title} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent-muted text-accent-light flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-primary">
                          {b.title}
                        </div>
                        <div className="text-xs text-muted leading-snug mt-0.5">
                          {b.body}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Application form (only when NONE / REJECTED) ──────────── */}
        {showForm && (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border bg-surface p-6 space-y-5"
          >
            <header className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/20 text-accent-light flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-primary">
                  Your application
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Demo work + a short intro. Helps admins approve quickly.
                </p>
              </div>
            </header>

            {/* Portfolio URL */}
            <div>
              <label
                htmlFor="portfolioUrl"
                className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2"
              >
                Portfolio URL{" "}
                <span className="text-muted font-medium normal-case tracking-normal">
                  (recommended)
                </span>
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="portfolioUrl"
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourname.artstation.com"
                  className="w-full h-11 pl-10 pr-4 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Behance, ArtStation, Sketchfab, Dribbble, or your own site.
              </p>
            </div>

            {/* Demo note */}
            <div>
              <label
                htmlFor="demoNote"
                className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2"
              >
                Tell us about your work
              </label>
              <textarea
                id="demoNote"
                value={demoNote}
                onChange={(e) => setDemoNote(e.target.value)}
                rows={5}
                minLength={MIN_DEMO_NOTE}
                maxLength={MAX_DEMO_NOTE}
                placeholder="What do you make? Which tools (Blender, Substance, After Effects…)? What kind of asset are you planning to publish here first?"
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all resize-y"
              />
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span
                  className={
                    demoNote.trim().length === 0
                      ? "text-muted"
                      : noteOk
                        ? "text-info"
                        : "text-danger"
                  }
                >
                  {demoNote.trim().length === 0
                    ? `${MIN_DEMO_NOTE}-${MAX_DEMO_NOTE} characters`
                    : demoNote.trim().length < MIN_DEMO_NOTE
                      ? `${MIN_DEMO_NOTE - demoNote.trim().length} more to go`
                      : "Looks good"}
                </span>
                <span className="text-muted tabular-nums">
                  {demoNote.trim().length}/{MAX_DEMO_NOTE}
                </span>
              </div>
            </div>

            {/* Sample uploads */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                Demo samples{" "}
                <span className="text-muted font-medium normal-case tracking-normal">
                  (optional, up to {MAX_SAMPLES})
                </span>
              </label>

              <div className="grid grid-cols-3 gap-3">
                {samples.map((s, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg border border-border bg-elevated overflow-hidden group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.previewUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeSample(i)}
                      aria-label="Remove sample"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-canvas/80 backdrop-blur text-muted hover:text-danger border border-border flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {samples.length < MAX_SAMPLES && (
                  <button
                    type="button"
                    onClick={() => sampleInputRef.current?.click()}
                    className="aspect-square rounded-lg border border-dashed border-border hover:border-accent/40 bg-elevated/40 hover:bg-elevated transition-colors flex flex-col items-center justify-center gap-1 text-muted hover:text-accent-light"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[11px] font-medium">Add image</span>
                  </button>
                )}
              </div>

              <input
                ref={sampleInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                multiple
                onChange={addSample}
                aria-label="Add demo sample images"
                className="hidden"
              />

              <p className="mt-2 text-xs text-muted">
                Renders, screenshots, or finished pieces from your portfolio.
                PNG / JPG / WebP, max {formatFileSize(MAX_SAMPLE_BYTES)} each.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white gradient-accent shadow-[0_0_24px_rgba(124,58,237,0.35)] hover:shadow-[0_0_32px_rgba(124,58,237,0.55)] disabled:opacity-60 disabled:pointer-events-none transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {status === "REJECTED"
                      ? "Re-submit application"
                      : "Send application"}
                  </>
                )}
              </button>
              <span className="text-xs text-muted">
                You can keep using the platform as a buyer while admins review.
              </span>
            </div>
          </form>
        )}

        {/* ── What happens next ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-5">
          <h3 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <Check className="w-4 h-4 text-accent-light" />
            What happens after you apply
          </h3>
          <ol className="mt-3 space-y-2 text-xs text-secondary leading-relaxed">
            <li className="flex gap-2">
              <span className="text-muted font-mono shrink-0">1.</span>
              Admins review your portfolio + samples — usually within one
              business day.
            </li>
            <li className="flex gap-2">
              <span className="text-muted font-mono shrink-0">2.</span>
              You get an in-app notification and email the moment a decision is
              made.
            </li>
            <li className="flex gap-2">
              <span className="text-muted font-mono shrink-0">3.</span>
              On approval your role flips to Creator and the upload tools
              unlock. Complete your KYC at any time to become payout-eligible.
            </li>
          </ol>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          disabled={pending}
          className="text-xs text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Back to dashboard
        </button>
      </div>
      {dialog}
    </>
  );
}
