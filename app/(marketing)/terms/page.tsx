import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Designo Terms of Service",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 prose-styles">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: 9 May 2026
        </p>
      </header>

      <p className="text-secondary leading-relaxed">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of Designo (&quot;Service&quot;, &quot;we&quot;, &quot;our&quot;).
        By creating an account or using the Service, you agree to be bound by
        these Terms. If you don&apos;t agree, don&apos;t use the Service.
      </p>

      <Section number="1" title="Eligibility">
        You must be at least 13 years old to use the Service, and at least 18
        years old (or the age of majority in your jurisdiction) to upload
        content for sale or receive payouts.
      </Section>

      <Section number="2" title="Your Account">
        You are responsible for safeguarding your account credentials and for
        all activity under your account. Notify us immediately of any
        unauthorised access. We may suspend or terminate accounts that violate
        these Terms.
      </Section>

      <Section number="3" title="Creator Uploads & Licensing">
        <p>
          When you upload an asset (&quot;Creator Content&quot;), you keep
          ownership of it. You grant Designo a non-exclusive, worldwide,
          royalty-free licence to host, display, market, and distribute your
          Creator Content as part of operating the Service. You also grant
          buyers the licence terms attached to each purchase.
        </p>
        <p>
          You represent and warrant that you own — or are authorised to upload
          and licence — every part of every asset you submit. You agree not to
          upload anything that infringes third-party rights, contains malware,
          or violates applicable law.
        </p>
      </Section>

      <Section number="4" title="Buyer Licences">
        Each purchase grants a standard royalty-free commercial licence (as
        described on the asset detail page) unless a different licence is
        specified. You may not redistribute, resell, sublicense, or claim
        authorship of the asset.
      </Section>

      <Section number="5" title="Payments & Payouts">
        <p>
          Payments are processed by third-party providers (e.g. Razorpay). We
          take a platform commission, currently {process.env.PLATFORM_COMMISSION_PERCENT ?? 20}% of the sale price.
          The remainder accrues to the creator&apos;s balance, payable on
          request subject to KYC verification and minimum payout thresholds.
        </p>
        <p>
          Refunds are at our discretion and generally limited to cases of asset
          defect, misrepresentation, or fraudulent purchase.
        </p>
      </Section>

      <Section number="6" title="Prohibited Conduct">
        You agree not to: (a) reverse engineer or scrape the Service in ways
        that exceed normal use; (b) upload malicious files; (c) impersonate
        others; (d) abuse rate-limited endpoints; (e) circumvent payment or
        licensing controls; (f) upload content that is illegal, hateful,
        sexually exploitative, or that infringes intellectual property.
      </Section>

      <Section number="7" title="Content Moderation">
        All uploads are reviewed before going live. We may reject, remove, or
        de-list any asset at our discretion, with or without notice, if we
        believe it violates these Terms or applicable law.
      </Section>

      <Section number="8" title="DMCA / IP Takedowns">
        We respect intellectual property. To report an infringement,
        contact us with: (i) the work allegedly infringed, (ii) the URL on
        the Service, (iii) your contact info, (iv) a good-faith statement,
        and (v) a signed declaration of accuracy.
      </Section>

      <Section number="9" title="Termination">
        You can close your account at any time. We may terminate or suspend
        your access at any time for any reason, including violation of these
        Terms. Pending payouts and outstanding obligations survive termination.
      </Section>

      <Section number="10" title="Disclaimer of Warranties">
        The Service is provided &quot;as is&quot; without warranties of any
        kind, express or implied, including merchantability, fitness for a
        particular purpose, and non-infringement.
      </Section>

      <Section number="11" title="Limitation of Liability">
        To the maximum extent permitted by law, Designo&apos;s total
        liability for any claim arising from the Service is limited to the
        greater of (a) the amount you paid us in the 12 months preceding the
        claim, or (b) INR 10,000.
      </Section>

      <Section number="12" title="Changes to These Terms">
        We may update these Terms from time to time. Material changes will be
        announced by email or in-product notice. Continued use of the Service
        after changes take effect constitutes acceptance.
      </Section>

      <Section number="13" title="Contact">
        Questions? Email{" "}
        <a
          href="mailto:mohdtalha206@gmail.com"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          mohdtalha206@gmail.com
        </a>
        .
      </Section>

      <div className="mt-12 pt-8 border-t border-border text-sm text-muted">
        See also our{" "}
        <Link
          href="/privacy"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          Privacy Policy
        </Link>
        .
      </div>
    </article>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-primary tracking-tight">
        {number}. {title}
      </h2>
      <div className="mt-3 text-secondary leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
