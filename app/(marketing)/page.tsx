import { Hero } from "./_sections/Hero";
import { TrustBar } from "./_sections/TrustBar";
import { Features } from "./_sections/Features";
import { Showcase } from "./_sections/Showcase";
import { HowItWorks } from "./_sections/HowItWorks";
import { Testimonials } from "./_sections/Testimonials";
import { FAQ } from "./_sections/FAQ";
import { CTA } from "./_sections/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
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
