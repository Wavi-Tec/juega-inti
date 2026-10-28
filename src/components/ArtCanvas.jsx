'use client';

import { useEffect, useRef } from 'react';

// Lienzo pequeño y animado para ilustraciones (final de partida, frasco del producto).
// `draw(ctx, width, height, segundos, fuente)` dibuja en coordenadas lógicas width × height.
export default function ArtCanvas({ draw, width, height, className, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const font = getComputedStyle(canvas).getPropertyValue('--font-display').trim() || 'sans-serif';
    const t0 = performance.now();
    let raf = 0;

    const render = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const cssW = canvas.clientWidth || width;
      const s = cssW / width;
      const pw = Math.round(cssW * dpr);
      const ph = Math.round(height * s * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height, (now - t0) / 1000, font);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [draw, width, height]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={label}
    />
  );
}
