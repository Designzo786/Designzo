import Image from "next/image";
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
      <Image
        src={src}
        alt={name ?? "Avatar"}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
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
