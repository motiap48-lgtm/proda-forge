import { useCallback, useRef, useEffect, useState } from "react";

export const useScrollSync = () => {
  // Refs for synchronized horizontal scrolling
  const scrollContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const isScrollingRef = useRef(false);

  // Refs for synchronized vertical scrolling (employee column + calendar body)
  const verticalScrollContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const isVerticalScrollingRef = useRef(false);

  // Keep calendar header aligned with calendar body when vertical scrollbar appears
  const [calendarHeaderPadRightPx, setCalendarHeaderPadRightPx] = useState<Record<string, number>>({});

  const measureCalendarHeaderPad = useCallback(() => {
    const next: Record<string, number> = {};

    verticalScrollContainersRef.current.forEach((el, key) => {
      if (!el) return;
      if (!key.startsWith("cal-")) return;

      const scheduleName = key.slice("cal-".length);
      const hasVerticalScrollbar = el.scrollHeight > el.clientHeight + 1;
      const scrollbarPx = hasVerticalScrollbar ? Math.max(0, el.offsetWidth - el.clientWidth) : 0;
      next[scheduleName] = scrollbarPx;
    });

    setCalendarHeaderPadRightPx((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (const k of nextKeys) {
        if (prev[k] !== next[k]) return next;
      }
      return prev;
    });
  }, []);

  // Synchronized horizontal scroll handler
  const handleSyncScroll = useCallback(
    (sourceKey: string) => (event: React.UIEvent<HTMLDivElement>) => {
      if (isScrollingRef.current) return;

      const source = event.currentTarget;
      const scrollLeft = source.scrollLeft;

      isScrollingRef.current = true;

      scrollContainersRef.current.forEach((container, key) => {
        if (key !== sourceKey && container && container.scrollLeft !== scrollLeft) {
          container.scrollLeft = scrollLeft;
        }
      });

      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    },
    []
  );

  // Synchronized vertical scroll handler
  const handleSyncVerticalScroll = useCallback(
    (sourceKey: string) => (event: React.UIEvent<HTMLDivElement>) => {
      if (isVerticalScrollingRef.current) return;

      const source = event.currentTarget;
      const scrollTop = source.scrollTop;

      isVerticalScrollingRef.current = true;

      const scheduleGroup = sourceKey.replace(/^(emp-|cal-)/, "");

      verticalScrollContainersRef.current.forEach((container, key) => {
        const containerGroup = key.replace(/^(emp-|cal-)/, "");
        if (key !== sourceKey && containerGroup === scheduleGroup && container && container.scrollTop !== scrollTop) {
          container.scrollTop = scrollTop;
        }
      });

      requestAnimationFrame(() => {
        isVerticalScrollingRef.current = false;
      });
    },
    []
  );

  // Register horizontal scroll container ref
  const registerScrollContainer = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) {
        scrollContainersRef.current.set(key, el);
      } else {
        scrollContainersRef.current.delete(key);
      }
    },
    []
  );

  // Register vertical scroll container ref
  const registerVerticalScrollContainer = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) {
        verticalScrollContainersRef.current.set(key, el);
        queueMicrotask(measureCalendarHeaderPad);
      } else {
        verticalScrollContainersRef.current.delete(key);
        queueMicrotask(measureCalendarHeaderPad);
      }
    },
    [measureCalendarHeaderPad]
  );

  useEffect(() => {
    measureCalendarHeaderPad();
    window.addEventListener("resize", measureCalendarHeaderPad);
    return () => window.removeEventListener("resize", measureCalendarHeaderPad);
  }, [measureCalendarHeaderPad]);

  return {
    calendarHeaderPadRightPx,
    handleSyncScroll,
    handleSyncVerticalScroll,
    registerScrollContainer,
    registerVerticalScrollContainer,
  };
};
