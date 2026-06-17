"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Wand2, RefreshCw, Save, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { STYLE_OPTIONS, PROMPT_EXAMPLES, type AiStyle } from "@/lib/ai";
import type { AiGenerationResult } from "@/lib/ai";
import { cn } from "@/lib/utils";

const AssetViewer = dynamic(() => import("@/components/assets/AssetViewer"), {
  loading: () => <div className="absolute inset-0 skeleton" />,
});

const HISTORY_KEY = "designzo.ai-history.v1";
const HISTORY_LIMIT = 12;

function loadHistory(): AiGenerationResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: AiGenerationResult[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, HISTORY_LIMIT))
    );
  } catch {
    // localStorage full or disabled — drop silently
  }
}

export function AiGenerateClient() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<AiStyle>("stylized");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiGenerationResult | null>(null);
  const [history, setHistory] = useState<AiGenerationResult[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { confirm, dialog } = useConfirm();

  // Hydrate from localStorage on mount. setHistory is the intended
  // one-time sync from disk → React state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
  }, []);

  async function generate(p: string, s: AiStyle) {
    if (p.trim().length < 3) {
      setError("Please enter a prompt with at least 3 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p.trim(), style: s }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Generation failed. Please try again.");
        setLoading(false);
        return;
      }
      const generation = data as AiGenerationResult;
      setResult(generation);
      const next = [
        generation,
        ...history.filter((h) => h.id !== generation.id),
      ].slice(0, HISTORY_LIMIT);
      setHistory(next);
      saveHistory(next);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function regenerate() {
    if (!result) return;
    void generate(result.prompt, result.style);
  }

  async function clearHistory() {
    const ok = await confirm({
      variant: "danger",
      title: "Clear all generation history?",
      body: "All saved AI generation results from this browser will be removed. The actual assets you saved to your library aren't affected.",
      confirmLabel: "Clear history",
    });
    if (!ok) return;
    setHistory([]);
    saveHistory([]);
  }

  function loadFromHistory(item: AiGenerationResult) {
    setResult(item);
    setPrompt(item.prompt);
    setStyle(item.style);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function fillExample(example: string) {
    setPrompt(example);
    textareaRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent-muted border border-accent/20 text-accent-light mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Beta · Mock provider
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="gradient-text-hero">AI 3D Generator</span>
        </h1>
        <p className="mt-3 text-secondary max-w-xl mx-auto">
          Describe an asset in natural language. We&apos;ll generate a live 3D
          preview you can rotate, refine, and save.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        {/* Prompt panel */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4 lg:sticky lg:top-24">
          <div>
            <label
              htmlFor="prompt"
              className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
            >
              Describe your asset
            </label>
            <textarea
              id="prompt"
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="e.g. A glowing neon crystal gem with iridescent shading…"
              className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm text-primary placeholder:text-muted/70 focus:outline-none focus:bg-surface focus:border-border-focus transition-all resize-none"
            />
            <div className="flex justify-between mt-1.5 text-xs text-muted">
              <span>{prompt.length}/500</span>
              <button
                type="button"
                onClick={() => setPrompt("")}
                disabled={!prompt}
                className="hover:text-secondary transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Style
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_OPTIONS.map((opt) => {
                const active = style === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStyle(opt.value)}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-xs font-medium border transition-all text-left",
                      active
                        ? "bg-accent-muted border-accent/40 text-accent-light"
                        : "bg-elevated border-border text-secondary hover:border-border-hover hover:text-primary"
                    )}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-muted mt-0.5 leading-tight">
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <FormError message={error} />

          <Button
            onClick={() => generate(prompt, style)}
            disabled={loading || prompt.trim().length < 3}
            className="w-full h-12"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Try a prompt
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => fillExample(ex)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-elevated border border-border text-secondary hover:border-accent/40 hover:text-accent-light transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Result panel */}
        <section className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-elevated to-canvas">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin mb-4" />
                  <div className="text-sm text-secondary">
                    Sculpting in 3D…
                  </div>
                  <div className="text-xs text-muted mt-1 max-w-xs mx-auto truncate">
                    &ldquo;{prompt}&rdquo;
                  </div>
                </div>
              </div>
            ) : result ? (
              <>
                <AssetViewer shape={result.shape} color={result.color} />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-canvas/80 backdrop-blur text-[11px] text-secondary border border-border">
                  Drag to rotate · Scroll to zoom
                </div>
                <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas/80 backdrop-blur text-[11px] text-accent-light border border-accent/20">
                  <Sparkles className="w-3 h-3" />
                  AI
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-accent-muted border border-accent/20 flex items-center justify-center text-accent-light mb-4">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-primary">
                  Your generation will appear here
                </div>
                <div className="text-xs text-muted mt-1 max-w-xs">
                  Enter a prompt and click Generate to create a 3D preview
                  you can rotate and refine.
                </div>
              </div>
            )}
          </div>

          {result && !loading && (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted mb-1">
                  Title
                </div>
                <div className="text-lg font-semibold text-primary">
                  {result.title}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted mb-1">
                  Prompt
                </div>
                <p className="text-sm text-secondary leading-relaxed italic">
                  &ldquo;{result.prompt}&rdquo;
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-accent-muted text-accent-light border border-accent/20">
                  {result.style}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="w-3 h-3 rounded-full border border-border inline-block" style={{ background: result.color }} />
                  {result.color}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={regenerate}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </Button>
                <Button
                  variant="gold"
                  disabled
                  title="Save to library — coming soon"
                >
                  <Save className="w-4 h-4" />
                  Save (soon)
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* History */}
      {history.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary inline-flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent generations
              <span className="text-xs text-muted font-normal">
                ({history.length})
              </span>
            </h2>
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear history
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => loadFromHistory(h)}
                className="group relative aspect-square rounded-xl border border-border bg-surface overflow-hidden hover:border-accent/40 transition-colors"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${h.color}55 0%, transparent 70%)`,
                  }}
                />
                <div
                  className="absolute inset-1/4 rounded-full blur-2xl"
                  style={{ background: h.color, opacity: 0.6 }}
                />
                <div className="absolute inset-x-2 bottom-2 text-left">
                  <div className="text-[11px] font-semibold text-primary truncate">
                    {h.title}
                  </div>
                  <div className="text-[10px] text-muted truncate">
                    {h.style}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted text-center">
            History is stored locally in your browser. Clearing your browser
            data will remove it.
          </p>
        </section>
      )}
      {dialog}
    </div>
  );
}
