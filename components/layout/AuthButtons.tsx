import Link from "next/link";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="h-9 px-4 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-elevated transition-colors flex items-center"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="h-9 px-4 rounded-lg text-sm font-medium text-white gradient-accent hover:opacity-90 transition-opacity flex items-center shadow-[0_0_24px_rgba(124,58,237,0.3)]"
      >
        Get started
      </Link>
    </div>
  );
}
