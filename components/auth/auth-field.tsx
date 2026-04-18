"use client";

import * as React from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
      <Field className={containerClassName} data-invalid={!!error}>
        {label ? (
          <FieldLabel
            htmlFor={fieldId}
            className={cn(
              "ml-1 block text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant",
              labelClassName
            )}
          >
            {label}
          </FieldLabel>
        ) : null}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        <div className="relative">
          {prefixIcon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-outline">
              {prefixIcon}
            </div>
          ) : null}
          <Input
            id={fieldId}
            ref={ref}
            aria-invalid={!!error}
            className={cn(
              "w-full rounded-xl border-0 bg-surface-container-lowest px-4 py-3.5 text-sm text-on-surface outline-none",
              "placeholder:text-outline-variant transition-[background-color,box-shadow,color] duration-200 focus-visible:ring-2 focus-visible:ring-primary/15",
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
        <FieldError>{error}</FieldError>
      </Field>
    );
  }
);

AuthField.displayName = "AuthField";

export { AuthField };
