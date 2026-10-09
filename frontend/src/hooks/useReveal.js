import { useEffect, useRef } from 'react';

/**
 * Adds `.revealed` to elements with `.reveal` as they enter the viewport.
 * Attach the ref to a container that holds `.reveal` children.
 */
export default function useReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.querySelectorAll('.reveal').forEach((n) => n.classList.add('revealed'));
      return;
    }

    const targets = el.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px', ...options }
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [options]);

  return ref;
}