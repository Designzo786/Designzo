"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  className,
  placeholder = "Search 3D models, textures, HDRIs…",
  autoFocus = false,
}: SearchBarProps) {
  const [q, setQ] = useState("");
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("relative w-full", className)} role="search">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search assets"
        className="w-full h-10 pl-10 pr-4 bg-input border border-border rounded-lg text-sm text-primary placeholder:text-muted focus:outline-none focus:border-border-focus focus:bg-surface transition-all"
      />
    </form>
  );
}
