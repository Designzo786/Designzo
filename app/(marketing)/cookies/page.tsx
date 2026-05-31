import Link from "next/link";

export const metadata = {
  title: "Cookie Policy",
  description: "How Designo uses cookies.",
};

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 prose-styles">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: 17 May 2026</p>
      </header>

      <p className="text-secondary leading-relaxed">
        This Cookie Policy explains how Designo uses cookies and similar
        technologies. It should be read alongside our{" "}
        <Link
          href="/privacy"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <Section title="What cookies are">
        <p>
          Cookies are small text files stored on your device by your browser.
          They let a website remember things between page loads and visits —
          such as keeping you signed in.
        </p>
      </Section>

      <Section title="How we use them">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-primary">Authentication:</strong> a secure
            session cookie keeps you signed in as you move between pages.
          </li>
          <li>
            <strong className="text-primary">Preferences:</strong> functional
            cookies remember settings like your chosen options in the
            interface.
          </li>
          <li>
            <strong className="text-primary">Security:</strong> cookies help us
            detect abuse and protect against fraudulent activity.
          </li>
        </ul>
        <p>
          We use only first-party cookies. We do{" "}
          <strong className="text-primary">not</strong> use third-party
          advertising or cross-site tracking cookies.
        </p>
      </Section>

      <Section title="Managing cookies">
        <p>
          You can delete or block cookies through your browser settings. Note
          that blocking the authentication cookie will prevent you from signing
          in, so parts of the site will not work.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy as the service evolves. Material changes
          will be announced by email or an in-product notice.
        </p>
      </Section>

      <div className="mt-12 pt-8 border-t border-border text-sm text-muted">
        See also our{" "}
        <Link
          href="/privacy"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/terms"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          Terms of Service
        </Link>
        .
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
