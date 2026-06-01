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
      {/* Categories sits right under Hero — it's the strongest concrete
          value-prop after the headline, so it deserves the prime slot. */}
      <Categories />
      <TrustBar />
      <Features />
      <Showcase />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
}
