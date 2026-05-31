import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NotificationsClient } from "./NotificationsClient";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/notifications");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Notifications
        </h1>
        <p className="text-sm text-muted mt-1">
          Every update from your sales, payouts, and activity in one place.
        </p>
      </header>

      <NotificationsClient />
    </div>
  );
}
