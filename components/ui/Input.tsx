import { cn } from "@/lib/utils";
import { type ComponentPropsWithoutRef, forwardRef, useId } from "react";

interface InputProps extends ComponentPropsWithoutRef<"input"> {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, error, hint, rightSlot, leftSlot, className, id, ...props },
    ref
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-secondary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftSlot && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {leftSlot}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "w-full h-11 px-4 bg-input border rounded-lg text-sm text-primary placeholder:text-muted/70",
              "focus:outline-none focus:bg-surface transition-all",
              error
                ? "border-danger focus:border-danger"
                : "border-border focus:border-border-focus",
              leftSlot && "pl-10",
              rightSlot && "pr-10",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {rightSlot}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
