/**
 * Inline JSON-LD `<script type="application/ld+json">` block.
 *
 * Search engines (Google, Bing, DuckDuckGo) parse this to power rich
 * results — product cards with price + rating in SERP, organization
 * sitelinks, breadcrumb trails under the listing URL, the WebSite
 * search box that appears on brand queries. Without it the listings
 * still rank but they don't get the extra real estate.
 *
 * We keep the schema generators in their own files so the asset detail
 * page can compose Product + BreadcrumbList side by side without
 * threading 80-line objects through the JSX.
 */
export function JsonLd({
  schema,
}: {
  schema: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      // Inline is the recommended approach per schema.org docs — the
      // payload has to be present in the HTML the crawler reads, not
      // injected at hydration time. `dangerouslySetInnerHTML` is the
      // only React-idiomatic way to skip the auto-escaping that would
      // otherwise break the JSON.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
