import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({
  className,
  containerClassName,
  priority = false,
  alt = "Gotly Keeper",
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[0.875rem] dark:bg-white/95 dark:px-2 dark:py-1",
        containerClassName
      )}
    >
      <Image
        src="/logo.svg"
        alt={alt}
        width={220}
        height={48}
        priority={priority}
        className={cn("h-10 w-auto", className)}
      />
    </span>
  );
}
