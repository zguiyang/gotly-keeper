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
              "ml-1 block text-[12px] font-medium tracking-normal text-on-surface-variant/85",
              labelClassName
            )}
          >
            {label}
          </FieldLabel>
        ) : null}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        <div className="relative">
          {prefixIcon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
              {prefixIcon}
            </div>
          ) : null}
          <Input
            id={fieldId}
            ref={ref}
            aria-invalid={!!error}
            className={cn(
              "h-10 w-full rounded-xl border border-border/12 bg-muted/45 px-3.5 py-2 text-sm text-on-surface outline-none shadow-none",
              "placeholder:text-muted-foreground/58 transition-[background-color,border-color,box-shadow,color] duration-200 hover:bg-muted/60 focus-visible:border-primary/24 focus-visible:bg-surface-container-lowest focus-visible:ring-4 focus-visible:ring-primary/10",
              prefixIcon && "pl-11",
              suffixIcon && "pr-11",
              error && "border-destructive/35 bg-destructive/[0.035] ring-4 ring-destructive/10",
              inputClassName,
              className
            )}
            {...props}
          />
          {suffixIcon ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground">
              {suffixIcon}
            </div>
          ) : null}
        </div>
        <FieldError className="ml-1 text-xs">{error}</FieldError>
      </Field>
    );
  }
);

AuthField.displayName = "AuthField";

export { AuthField };
