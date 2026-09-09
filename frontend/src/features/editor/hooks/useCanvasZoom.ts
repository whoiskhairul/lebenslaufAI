import { useEffect, useRef, useState } from 'react';

/**
 * Zoom-to-fit scale for the A4 canvas viewport (794px = A4 @ 96dpi).
 * Recomputes on window resize and whenever `recomputeKeys` change
 * (e.g. tab switches, page size changes or mobile pane visibility).
 *
 * Also measures the scaled page-stack wrapper and returns the negative
 * bottom-margin needed to cancel the flow height left behind by the
 * CSS transform scale.
 */
export function useCanvasZoom(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  recomputeKeys: unknown[],
  compensationKeys: unknown[]
) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (viewportRef.current) {
        const viewportWidth = viewportRef.current.clientWidth - 40;
        if (viewportWidth <= 0) return;
        const pageWidth = 794;
        setScale(Math.min(1, viewportWidth / pageWidth));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, recomputeKeys);

  // Compensate the layout height of the scaled page stack (transform does not affect flow size)
  const scaledWrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperHeightCompensation, setWrapperHeightCompensation] = useState(0);

  useEffect(() => {
    const el = scaledWrapperRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      setWrapperHeightCompensation(h > 0 ? h * (1 - scale) : 0);
    };
    measure();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    return () => {
      if (observer) observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, ...compensationKeys]);

  return { scale, setScale, scaledWrapperRef, wrapperHeightCompensation };
}
