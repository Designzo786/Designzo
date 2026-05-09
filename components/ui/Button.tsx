import { cn } from "@/lib/utils";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "gold"
  | "outline";

export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[0_0_24px_rgba(124,58,237,0.25)] hover:bg-accent-hover hover:shadow-[0_0_36px_rgba(124,58,237,0.45)]",
  secondary:
    "bg-elevated text-primary border border-border hover:bg-overlay hover:border-border-hover",
  ghost:
    "bg-transparent text-secondary hover:bg-elevated hover:text-primary",
  danger:
    "bg-danger text-white hover:bg-red-600",
  gold:
    "bg-gold text-black font-semibold hover:bg-gold-light shadow-[0_0_24px_rgba(245,158,11,0.2)]",
  outline:
    "bg-transparent text-primary border border-border-hover hover:border-accent hover:text-accent-light",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-12 px-6 text-base rounded-xl",
};

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
