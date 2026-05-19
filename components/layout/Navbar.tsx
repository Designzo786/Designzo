import Link from "next/link";
import { Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { ExploreMenu } from "./ExploreMenu";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";
import { AuthButtons } from "./AuthButtons";
import { NotificationBell } from "./NotificationBell";

export async function Navbar() {
  // Don't crash the navbar if auth() fails (e.g. DB not configured yet during dev)
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4">
          <Logo />

          <div className="hidden md:block">
            <ExploreMenu />
          </div>

          <Link
            href="/ai-generate"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-accent/20 to-accent-light/20 border border-accent/30 text-accent-light hover:from-accent/30 hover:to-accent-light/30 hover:border-accent/50 hover:text-primary transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Generate
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-auto">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <NotificationBell />
                <UserMenu session={session} />
              </>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
