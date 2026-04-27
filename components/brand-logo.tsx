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
    <span className={cn("inline-flex items-center", containerClassName)}>
      <Image
        src="/logo.svg"
        alt={alt}
        width={220}
        height={48}
        priority={priority}
        className={cn("h-10 w-auto dark:hidden", className)}
      />
      <Image
        src="/logo-dark.svg"
        alt={alt}
        width={220}
        height={48}
        priority={priority}
        className={cn("hidden h-10 w-auto dark:block", className)}
      />
    </span>
  );
}
