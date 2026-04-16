import { useEffect, useRef, useState } from "react";

export function useDeferredSection(options = {}) {
  const { root = null, rootMargin = "240px 0px", threshold = 0.01, once = true } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || (once && isVisible)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible, once, root, rootMargin, threshold]);

  return { ref, isVisible };
}
