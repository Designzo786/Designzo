import { Hero } from "./_sections/Hero";
import { Categories } from "./_sections/Categories";
import { Showcase } from "./_sections/Showcase";
import { Stats } from "./_sections/Stats";
import { CTA } from "./_sections/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Categories />
      <Showcase />
      <CTA />
    </>
  );
}
