import { Hero } from "./_sections/Hero";
import { TrustBar } from "./_sections/TrustBar";
import { Features } from "./_sections/Features";
import { Categories } from "./_sections/Categories";
import { Showcase } from "./_sections/Showcase";
import { HowItWorks } from "./_sections/HowItWorks";
import { Testimonials } from "./_sections/Testimonials";
import { FAQ } from "./_sections/FAQ";
import { CTA } from "./_sections/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* All sections after the Hero share a single continuous ambient
          backdrop so the page reads as one premium canvas instead of a
          stack of differently-tinted blocks. The Hero has its own
          animated drifting blobs and lives outside this wrapper. */}
      <div className="relative isolate">
        {/* Single low-opacity violet field that spans the entire
            below-the-fold area. Sits behind every section at -z-10. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute top-[10%] -left-40 w-150 h-150 rounded-full blur-3xl bg-accent/8" />
          <div className="absolute top-[50%] -right-40 w-150 h-150 rounded-full blur-3xl bg-accent-light/6" />
          <div className="absolute bottom-[5%] left-[30%] w-160 h-100 rounded-full blur-3xl bg-fuchsia-500/5" />
        </div>

        <Categories />
        <TrustBar />
        <Features />
        <Showcase />
        <HowItWorks />
        <Testimonials />
        <FAQ />
        <CTA />
      </div>
    </>
  );
}
