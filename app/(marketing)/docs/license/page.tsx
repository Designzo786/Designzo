import Link from "next/link";

export const metadata = {
  title: "Licensing",
  description:
    "The licenses that apply to assets bought and sold on Designzo.",
};

export default function LicensePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 prose-styles">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Licensing
        </h1>
        <p className="mt-2 text-secondary">
          What you can and can&apos;t do with assets purchased on Designzo.
        </p>
      </header>

      <p className="text-secondary leading-relaxed">
        Unless an asset&apos;s detail page states otherwise, every purchase —
        paid or free — grants the buyer a{" "}
        <strong className="text-primary">
          standard royalty-free commercial license
        </strong>
        . The creator keeps ownership of the asset; you receive a license to
        use it.
      </p>

      <Section title="What the license allows">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Use the asset in unlimited personal and commercial projects.
          </li>
          <li>
            Use it in games, films, apps, renders, advertising, and client
            work.
          </li>
          <li>Modify, retexture, or remix the asset for your own projects.</li>
          <li>
            Keep using it permanently — the license does not expire, even after
            a refund window closes.
          </li>
        </ul>
      </Section>

      <Section title="What the license does not allow">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Reselling, redistributing, or sublicensing the asset as-is, or as
            part of an asset pack or competing marketplace.
          </li>
          <li>
            Claiming authorship of the asset or registering it as your own
            intellectual property.
          </li>
          <li>
            Sharing the downloaded file publicly or with people who have not
            purchased it.
          </li>
          <li>Using the asset in unlawful, hateful, or infringing content.</li>
        </ul>
      </Section>

      <Section title="Free assets">
        <p>
          Assets priced at ₹0 are tracked as purchases and carry the same
          standard license. Some free assets may waive attribution — check the
          asset&apos;s detail page. No payment is processed for free downloads.
        </p>
      </Section>

      <Section title="Extended use">
        <p>
          If your use case falls outside the standard license — for example,
          embedding an asset in a product that is itself sold to end users for
          further editing — contact the creator or our team before purchase so
          the right terms can be arranged.
        </p>
      </Section>

      <Section title="Creator responsibilities">
        <p>
          Creators warrant that they own or are authorised to license every
          part of every asset they upload. Assets that infringe third-party
          rights are removed, and the{" "}
          <Link
            href="/terms"
            className="text-accent-light hover:text-accent underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          govern any dispute.
        </p>
      </Section>

      <div className="mt-12 pt-8 border-t border-border text-sm text-muted">
        Questions about a specific license? Reach us via the{" "}
        <Link
          href="/contact"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          Contact
        </Link>{" "}
        page.
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-primary tracking-tight">
        {title}
      </h2>
      <div className="mt-3 text-secondary leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
