import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh flex flex-col">
      {/* ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(124,58,237,0.22), transparent 70%)",
        }}
      />

      {/* top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <Logo hideText />
      </div>

      {/* centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-accent/15 via-transparent to-accent-light/10 blur-2xl pointer-events-none"
            />
            <div className="relative glass-strong rounded-2xl border border-border p-8 shadow-2xl">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
