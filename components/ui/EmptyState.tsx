import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}

export function EmptyState({ icon: Icon, title, description, cta }: Props) {
  return (
    <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-elevated flex items-center justify-center text-muted mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-muted max-w-sm mx-auto mb-5">{description}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary border border-border hover:border-accent/40 hover:text-accent-light transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
