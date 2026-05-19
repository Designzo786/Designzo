import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "GameChanger Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 prose-styles">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: 9 May 2026
        </p>
      </header>

      <p className="text-secondary leading-relaxed">
        This Privacy Policy describes how GameChanger (&quot;we&quot;,
        &quot;our&quot;) collects, uses, and shares information when you use
        our service. By using GameChanger you agree to this Policy.
      </p>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-primary">Account info:</strong> name,
            email address, hashed password, profile picture, bio, and website.
          </li>
          <li>
            <strong className="text-primary">KYC data (creators only):</strong>{" "}
            legal name, government-issued ID numbers, ID images, and bank
            account details — collected only when you request a payout.
          </li>
          <li>
            <strong className="text-primary">Content:</strong> assets you
            upload, asset metadata (title, tags, description), and download or
            purchase history.
          </li>
          <li>
            <strong className="text-primary">Usage:</strong> pages you visit,
            search queries, and basic device info such as browser and IP
            address. Used to detect abuse and improve the service.
          </li>
          <li>
            <strong className="text-primary">Payments:</strong> we don&apos;t
            store full card details. Payments are handled by Razorpay and we
            keep only transaction IDs and amounts for our records.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul className="list-disc pl-5 space-y-2">
          <li>To create and operate your account.</li>
          <li>To process purchases and creator payouts.</li>
          <li>
            To send transactional emails (verification, password reset,
            purchase receipts).
          </li>
          <li>To moderate content and enforce our Terms of Service.</li>
          <li>To improve the product and prevent abuse and fraud.</li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-primary">Service providers:</strong> Neon
            (database hosting), Cloudflare (file storage and CDN), Vercel
            (application hosting), Resend (email delivery), Razorpay (payments).
            They access only what they need to operate.
          </li>
          <li>
            <strong className="text-primary">Buyers and creators:</strong> your
            display name, public profile, and the assets you upload are
            visible to other users. KYC data and email addresses are not.
          </li>
          <li>
            <strong className="text-primary">Authorities:</strong> when
            required by law, court order, or to protect our rights or the
            safety of others.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="How we secure it">
        <ul className="list-disc pl-5 space-y-2">
          <li>Passwords are hashed with bcrypt before storage.</li>
          <li>All traffic is encrypted in transit via HTTPS.</li>
          <li>
            Asset files are stored on private buckets and served via
            time-limited signed URLs.
          </li>
          <li>
            Access to KYC data is restricted to the user themselves and to
            authorized administrators on a need-to-know basis.
          </li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on your jurisdiction, you may have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Access the personal information we hold about you.</li>
          <li>Correct inaccurate information.</li>
          <li>Delete your account and associated personal information.</li>
          <li>Export your data.</li>
          <li>Object to or restrict certain types of processing.</li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a
            href="mailto:privacy@gamechanger.example"
            className="text-accent-light hover:text-accent underline underline-offset-2"
          >
            privacy@gamechanger.example
          </a>
          .
        </p>
      </Section>

      <Section title="Cookies">
        We use first-party cookies for authentication (session management) and
        functional preferences. We don&apos;t use third-party advertising
        cookies.
      </Section>

      <Section title="Data retention">
        We keep your account data while your account is active. After deletion
        we may retain limited records (transactions, anti-abuse logs) for up
        to 7 years to comply with legal and tax obligations.
      </Section>

      <Section title="Children">
        The Service is not directed to children under 13. We don&apos;t
        knowingly collect personal information from children under 13. If you
        believe a child has provided us information, contact us and we&apos;ll
        delete it.
      </Section>

      <Section title="Changes">
        We may update this Policy from time to time. Material changes will be
        announced by email or in-product notice.
      </Section>

      <Section title="Contact">
        For privacy questions, email{" "}
        <a
          href="mailto:privacy@gamechanger.example"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          privacy@gamechanger.example
        </a>
        .
      </Section>

      <div className="mt-12 pt-8 border-t border-border text-sm text-muted">
        See also our{" "}
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
