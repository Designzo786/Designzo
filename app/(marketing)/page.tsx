import { Hero } from "./_sections/Hero";
import { TrustBar } from "./_sections/TrustBar";
import { Features } from "./_sections/Features";
import { Categories } from "./_sections/Categories";
// import { Showcase } from "./_sections/Showcase";
import { JustLanded } from "./_sections/JustLanded";
import { CategoryShowcase } from "./_sections/CategoryShowcase";
import { Hexagon, Sparkles, Layers, Box } from "lucide-react";
import { HowItWorks } from "./_sections/HowItWorks";
import { Testimonials } from "./_sections/Testimonials";
import { FAQ } from "./_sections/FAQ";
import { CTA } from "./_sections/CTA";

export default function HomePage() {
  return (
    // Every section sits inside this single wrapper so the ambient violet
    // field is one continuous layer from the top of the Hero down to the
    // CTA. No per-section backdrop resets means no "this is where a new
    // panel starts" colour shift when you scroll.
    <div className="relative isolate">
      {/* Continuous page-wide ambient backdrop — three large blurred
          radials anchored to fixed viewport positions so the violet
          glow follows scrolling instead of restarting at each section.
          Sits at -z-10 behind everything, including the Hero's own
          animated drifting blobs (which layer on top of this field). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-[15%] -left-40 w-150 h-150 rounded-full blur-3xl bg-accent/10" />
        <div className="absolute top-[45%] -right-40 w-150 h-150 rounded-full blur-3xl bg-accent-light/8" />
        <div className="absolute top-[75%] left-[30%] w-160 h-100 rounded-full blur-3xl bg-fuchsia-500/6" />
      </div>

      <Hero />

      {/* Bridge layer — a tall fade that overlaps the bottom of the Hero
          and the top of Categories. Eliminates the hard horizontal line
          the user was seeing between sections by softly diffusing the
          Hero's denser blob field into the page's continuous backdrop. */}
      <div
        aria-hidden
        className="pointer-events-none relative -mt-24 sm:-mt-32 h-24 sm:h-32 z-0 bg-linear-to-b from-transparent via-canvas/40 to-canvas"
      />

      <Categories />
      <TrustBar />
      <Features />
      {/* Top-downloaded popular work first, then freshest drops, then
          per-category rails. Each category rail auto-hides when it has
          no APPROVED assets so a new marketplace doesn't show empty
          'Premium Lottie' panels. Discovery arc: popular → new → by
          format → how it works. */}
      {/* Showcase ("See it before you buy") hidden for now per request —
          uncomment + restore the import above to bring it back. */}
      {/* <Showcase /> */}
      <JustLanded />
      <CategoryShowcase
        categorySlug="3d-models"
        eyebrow="3D Models"
        icon={Box}
        heading="Production-ready 3D models for every pipeline"
        subheading="Game-ready, PBR-textured 3D models in glTF + FBX + OBJ + USDZ — drop into Unity, Unreal, Blender, or Apple AR."
        pillAccent="bg-violet-500/15 border border-violet-500/25 text-violet-300"
        ctaLabel="Browse all 3D models"
      />
      <CategoryShowcase
        categorySlug="3d-icons"
        eyebrow="3D Icons"
        icon={Hexagon}
        heading="Premium 3D icons, ready for any product"
        subheading="Royalty-free 3D icons in PNG + glTF — drop them into apps, decks, and ads."
        pillAccent="bg-sky-500/15 border border-sky-500/25 text-sky-300"
        ctaLabel="Browse all 3D icons"
      />
      <CategoryShowcase
        categorySlug="lottie"
        eyebrow="Lottie animations"
        icon={Sparkles}
        heading="Lightweight Lottie for the web"
        subheading="Tiny JSON animations that play crisply at any size. Drop into Lottie web, dotLottie, or React in a single line."
        pillAccent="bg-pink-500/15 border border-pink-500/25 text-pink-300"
        ctaLabel="Browse all Lottie"
      />
      <CategoryShowcase
        categorySlug="svg-icons"
        eyebrow="SVG icons"
        icon={Layers}
        heading="Scalable SVG icons in every style"
        subheading="Outline, filled, duotone — vector icons that crisp up at every size on every device."
        pillAccent="bg-emerald-500/15 border border-emerald-500/25 text-emerald-300"
        ctaLabel="Browse all SVG icons"
      />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
    </div>
  );
}
