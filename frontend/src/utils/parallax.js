// Lightweight scroll parallax.
// Usage: <div data-parallax="0.15"> moves up 15% of scroll distance.
export function initParallax() {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  let raf = null;
  const update = () => {
    raf = null;
    const els = document.querySelectorAll('[data-parallax]');
    const y = window.scrollY;
    els.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      el.style.transform = `translate3d(0, ${-y * speed}px, 0)`;
    });
  };

  const onScroll = () => {
    if (raf == null) raf = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (raf) cancelAnimationFrame(raf);
  };
}