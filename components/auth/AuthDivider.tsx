export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-canvas px-3 text-xs font-medium tracking-wider text-muted uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}
