import { requireAdmin } from "@/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { AdminSidebar } from "./AdminSidebar";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 px-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold bg-gold-muted border border-gold/20 rounded-md py-1">
              Admin Panel
            </div>
            <AdminSidebar />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
