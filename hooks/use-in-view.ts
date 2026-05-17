"use client";

import { useEffect, useState, type RefObject } from "react";

type UseInViewOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
};

export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseInViewOptions = {},
): boolean {
  const { threshold = 0, rootMargin = "0px", once = true } = options;
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (once && isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin, once, isInView]);

  return isInView;
}
