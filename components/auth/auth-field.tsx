"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    {
      className,
      label,
      description,
      error,
      prefixIcon,
      suffixIcon,
      id,
      containerClassName,
      labelClassName,
      inputClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const fieldId = id || generatedId;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label ? (
          <label
            htmlFor={fieldId}
            className={cn(
              "ml-1 block text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant",
              labelClassName
            )}
          >
            {label}
          </label>
        ) : null}
        {description ? <p className="text-xs text-on-surface-variant">{description}</p> : null}
        <div className="relative">
          {prefixIcon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-outline">
              {prefixIcon}
            </div>
          ) : null}
          <input
            id={fieldId}
            ref={ref}
            className={cn(
              "w-full rounded-xl border-0 bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface outline-none transition-all",
              "placeholder:text-outline-variant focus:ring-2 focus:ring-primary/15",
              prefixIcon && "pl-11",
              suffixIcon && "pr-11",
              error && "ring-2 ring-destructive/20",
              inputClassName,
              className
            )}
            {...props}
          />
          {suffixIcon ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-outline">
              {suffixIcon}
            </div>
          ) : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }
);

AuthField.displayName = "AuthField";

export { AuthField };
