import { useEffect, useState } from 'react';

import { fetchPostStats, recordPostView } from '../utils/comments';

/**
 * Post IDs for which a view has already been sent in this app session.
 * Module-level — survives re-mounts and re-renders.
 */
const sentPostIds = new Set();

const VISIBILITY_THRESHOLD = 0.7; // 70 % of the card must be in viewport
const VIEW_DELAY_MS = 5_000;      // 5 seconds of continuous visibility

/**
 * usePostViewTracker
 *
 * Attaches an IntersectionObserver to the element referenced by `elementRef`
 * and records a view to the backend after the element has been continuously
 * visible (≥ 70 %) for 5 uninterrupted seconds. Any scroll event during that
 * window resets the timer.
 *
 * Also fetches initial stats via GET /stats as soon as the element enters the
 * viewport (lazy, no threshold), so the view count is visible even before the
 * current user's view is counted.
 *
 * @param {React.RefObject} elementRef  Ref attached to the card DOM element.
 * @param {number|string}   postId      External VK post id.
 * @param {string}          token       JWT from commentsAuth (empty string = not authed).
 * @returns {{ views_total: number, viewers_unique_7d: number } | null}
 */
export function usePostViewTracker(elementRef, postId, token) {
  const [viewStats, setViewStats] = useState(null);

  // ── Initial stats fetch (no auth needed, fires on first intersection) ──────
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    let fetched = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (fetched || !entries.some((e) => e.isIntersecting)) return;
        fetched = true;
        observer.disconnect();
        fetchPostStats(postId)
          .then(setViewStats)
          .catch(() => { /* silently ignore */ });
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, postId]);

  // ── 5-second view tracker (requires auth token) ───────────────────────────
  useEffect(() => {
    if (!token) return undefined;
    const element = elementRef.current;
    if (!element || sentPostIds.has(postId)) return undefined;

    let timer = null;
    let isVisible = false;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timer = setTimeout(async () => {
        if (!isVisible || sentPostIds.has(postId)) return;
        sentPostIds.add(postId);
        try {
          const stats = await recordPostView(postId, token);
          setViewStats(stats);
        } catch {
          // Allow retry on next mount if request failed
          sentPostIds.delete(postId);
        }
      }, VIEW_DELAY_MS);
    };

    const viewObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.intersectionRatio >= VISIBILITY_THRESHOLD;
        if (isVisible) {
          startTimer();
        } else {
          clearTimer();
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    );

    viewObserver.observe(element);

    // Scroll resets the timer (timer restarts so the 5s is always uninterrupted)
    const handleScroll = () => {
      if (isVisible) {
        startTimer();
      } else {
        clearTimer();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimer();
      viewObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [elementRef, postId, token]);

  return viewStats;
}
