import { Hero } from "./_sections/Hero";
import { TrustBar } from "./_sections/TrustBar";
import { Features } from "./_sections/Features";
import { Categories } from "./_sections/Categories";
import { Showcase } from "./_sections/Showcase";
import { JustLanded } from "./_sections/JustLanded";
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
          how it all works. Discovery arc: popular → new → how it works. */}
      <Showcase />
      <JustLanded />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
    </div>
  );
}
