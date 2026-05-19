import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 36, className }: AvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

  if (src) {
    return (
      // Plain <img>, not next/image: avatars are user-uploaded files written
      // to /public at runtime. The image optimizer is unreliable for those
      // (it 400s on files it can't pre-resolve), so we serve them directly —
      // the same approach AssetCard uses for uploaded previews.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Avatar"}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn("rounded-full object-cover shrink-0", className)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold gradient-accent select-none shrink-0",
        className
      )}
      aria-label={name ?? "Avatar"}
    >
      {initial}
    </div>
  );
}
