import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata = { title: "Admin Sign In" };

export default async function AdminLoginPage() {
  // If they're already an admin, skip the form entirely
  const session = await auth().catch(() => null);
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
