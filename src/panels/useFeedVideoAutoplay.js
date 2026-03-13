import { useCallback, useEffect, useRef } from 'react';

export function useFeedVideoAutoplay() {
  const elementsRef = useRef(new Map());
  const visibilityRef = useRef(new Map());
  const observerRef = useRef(null);
  const frameRef = useRef(0);
  const currentPlayingIdRef = useRef('');

  const syncPlayback = useCallback(() => {
    frameRef.current = 0;

    const candidates = [];
    for (const [id, element] of elementsRef.current.entries()) {
      if (!element?.isConnected) {
        continue;
      }

      const ratio = visibilityRef.current.get(id) || 0;
      if (ratio <= 0) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        continue;
      }

      candidates.push({ id, element, ratio, top: rect.top });
    }

    candidates.sort((left, right) => {
      if (left.top !== right.top) {
        return left.top - right.top;
      }

      return right.ratio - left.ratio;
    });

    const nextActive = candidates[0] || null;

    for (const [id, element] of elementsRef.current.entries()) {
      if (!element?.isConnected) {
        continue;
      }

      if (nextActive && id === nextActive.id) {
        element.muted = true;
        const playPromise = element.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => undefined);
        }
      } else if (!element.paused) {
        element.pause();
      }
    }

    currentPlayingIdRef.current = nextActive?.id || '';
  }, []);

  const scheduleSync = useCallback(() => {
    if (frameRef.current) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(syncPlayback);
  }, [syncPlayback]);

  useEffect(() => {
    const elements = elementsRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.feedVideoId;
          if (!id) {
            return;
          }

          visibilityRef.current.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        scheduleSync();
      },
      {
        threshold: [0, 0.15, 0.35, 0.5, 0.75, 1],
      },
    );

    observerRef.current = observer;
    for (const [id, element] of elements.entries()) {
      element.dataset.feedVideoId = id;
      observer.observe(element);
    }

    const handleViewportChange = () => scheduleSync();

    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);

      observer.disconnect();
      observerRef.current = null;

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }

      for (const element of elements.values()) {
        if (element && !element.paused) {
          element.pause();
        }
      }
    };
  }, [scheduleSync]);

  const registerVideo = useCallback(
    (id) => (element) => {
      const previous = elementsRef.current.get(id);
      if (previous && observerRef.current) {
        observerRef.current.unobserve(previous);
      }

      if (!element) {
        elementsRef.current.delete(id);
        visibilityRef.current.delete(id);
        scheduleSync();
        return;
      }

      element.dataset.feedVideoId = id;
      element.playsInline = true;
      element.loop = true;

      elementsRef.current.set(id, element);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }

      scheduleSync();
    },
    [scheduleSync],
  );

  return { registerVideo };
}