import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-danger-muted border border-danger/20 text-danger text-sm animate-fade-in"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="leading-snug">{message}</span>
    </div>
  );
}
