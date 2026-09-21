import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

/**
 * Screen-only: scales a fixed-mm `.dtr-page` to fit the available panel width.
 * Print/PDF builds its own unscaled HTML, so this never affects output size.
 */
export default function DtrFitPreview({
  children,
  maxScale = 1,
  minScale = 0.42,
}) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [metrics, setMetrics] = useState({ scale: 1, w: 0, h: 0 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let raf = 0;
    const measure = () => {
      const page = content.querySelector('.dtr-page') || content.firstElementChild;
      if (!page) return;
      // offset* ignores CSS transforms — natural print size in px
      const needW = page.offsetWidth;
      const needH = page.offsetHeight;
      if (!needW || !needH) return;

      const availW = Math.max(0, viewport.clientWidth);
      let scale = availW > 0 ? availW / needW : 1;
      scale = Math.min(maxScale, Math.max(minScale, scale));
      if (scale > 1) scale = 1;

      setMetrics((prev) => {
        if (
          Math.abs(prev.scale - scale) < 0.002 &&
          prev.w === needW &&
          prev.h === needH
        ) {
          return prev;
        }
        return { scale, w: needW, h: needH };
      });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(viewport);
    ro.observe(content);
    schedule();
    const t = window.setTimeout(schedule, 120);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [maxScale, minScale]);

  const { scale, w, h } = metrics;
  const scaledW = w ? w * scale : '100%';
  const scaledH = h ? h * scale : 'auto';

  return (
    <Box
      ref={viewportRef}
      className="dtr-screen-fit"
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: scaledW,
          height: scaledH,
          position: 'relative',
          flexShrink: 0,
          maxWidth: '100%',
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: w || 'max-content',
            willChange: 'transform',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
