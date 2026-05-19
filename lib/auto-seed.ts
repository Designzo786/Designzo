/**
 * Auto-seeding is DISABLED.
 *
 * The marketplace runs on real uploaded assets only. Previously this module
 * re-created sample/mock assets whenever they were missing — which would
 * silently repopulate the catalogue after a deliberate cleanup.
 *
 * `ensureSampleAssetsSeeded()` is kept as a no-op so existing call sites
 * (e.g. the explore page) don't need to change. To intentionally bootstrap
 * sample data again, run `npx prisma db seed` manually.
 */
export function ensureSampleAssetsSeeded(): Promise<void> {
  return Promise.resolve();
}
