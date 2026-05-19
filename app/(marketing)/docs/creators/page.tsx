import Link from "next/link";

export const metadata = {
  title: "Creator Guide",
  description: "How to prepare, upload, and sell assets on GameChanger.",
};

export default function CreatorGuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 prose-styles">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
          Creator Guide
        </h1>
        <p className="mt-2 text-secondary">
          Everything you need to list your first asset and start earning.
        </p>
      </header>

      <Section number="1" title="Getting started">
        <p>
          Selling on GameChanger requires a{" "}
          <strong className="text-primary">Collaborator</strong> account. When
          you{" "}
          <Link
            href="/register"
            className="text-accent-light hover:text-accent underline underline-offset-2"
          >
            register
          </Link>
          , choose the Collaborator account type — it unlocks the upload tools
          in your dashboard. Plain User accounts can browse and buy only.
        </p>
      </Section>

      <Section number="2" title="Preparing your asset">
        <p>
          Before uploading, make sure your asset is production-ready: clean
          topology for models, correctly-sized texture maps, and no missing
          files. Each listing needs:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>The asset file itself (the file buyers download).</li>
          <li>A preview image — PNG, JPEG, or WebP, up to 5 MB.</li>
          <li>A clear title and a description of at least 10 characters.</li>
        </ul>
      </Section>

      <Section number="3" title="Accepted formats">
        <p>Pick the file type that matches your upload:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-primary">3D Models:</strong> GLB, GLTF, FBX,
            OBJ, BLEND, USDZ, STL, DAE, 3DS, PLY
          </li>
          <li>
            <strong className="text-primary">Textures:</strong> PNG, JPG, WebP,
            TGA, TIFF, BMP, EXR
          </li>
          <li>
            <strong className="text-primary">HDRIs:</strong> HDR, EXR
          </li>
          <li>
            <strong className="text-primary">Materials:</strong> ZIP, SBSAR,
            MTL, MAT, GLSL
          </li>
        </ul>
        <p>
          Uploads are content-checked — a file whose contents don&apos;t match
          its type, or that looks like a program, is rejected automatically.
        </p>
      </Section>

      <Section number="4" title="Pricing your work">
        <p>
          You set the price. Free assets (₹0) are allowed and are a great way to
          build a following. For paid assets, GameChanger keeps a 20% platform
          commission — you receive 80% of every sale.
        </p>
      </Section>

      <Section number="5" title="The review process">
        <p>
          Every submission starts as <strong className="text-primary">Pending</strong>.
          Our team reviews it for quality, accurate metadata, and licensing
          before it goes live — usually within a couple of business days. If
          something needs fixing, you&apos;ll see a rejection note on the asset
          in your dashboard so you can resubmit.
        </p>
      </Section>

      <Section number="6" title="Getting paid">
        <p>
          Earnings accumulate in your dashboard balance. To withdraw, complete a
          one-time KYC verification (required by Indian regulations), then
          request a payout — funds are sent to your bank account via RazorpayX,
          typically within 1-3 business days.
        </p>
      </Section>

      <div className="mt-12 pt-8 border-t border-border text-sm text-muted">
        See also our{" "}
        <Link
          href="/docs/license"
          className="text-accent-light hover:text-accent underline underline-offset-2"
        >
          Licensing
        </Link>{" "}
        terms.
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
