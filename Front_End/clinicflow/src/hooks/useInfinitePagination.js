import { useEffect, useMemo, useRef, useState } from "react";

export function useInfinitePagination(items, pageSize = 12) {
  const [page, setPage] = useState(1);
  const loaderRef = useRef(null);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const visibleItems = useMemo(
    () => items.slice(0, page * pageSize),
    [items, page, pageSize]
  );

  const hasMore = visibleItems.length < items.length;

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "300px 0px", threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleItems.length]);

  return {
    visibleItems,
    hasMore,
    loadMoreRef: loaderRef,
    resetPagination: () => setPage(1),
  };
}
