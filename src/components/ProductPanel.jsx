'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import ArtCanvas from './ArtCanvas';
import { CloseIcon } from './icons';
import { drawBottle } from '@/game/art';
import { PRODUCTO, AVISO_FANTASIA } from '@/content/producto';

const drawBottleArt = (ctx, w, h, t, font) => drawBottle(ctx, w / 2, h - 8, 0.9 + Math.sin(t * 2) * 0.01, font);

export default function ProductPanel({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="producto-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-head">
          {PRODUCTO.imagenFrasco ? (
            <Image
              className="sheet-bottle is-photo"
              src={PRODUCTO.imagenFrasco}
              alt={`Frasco y caja de ${PRODUCTO.nombre}`}
              sizes="30vw"
            />
          ) : (
            <ArtCanvas
              className="sheet-bottle"
              draw={drawBottleArt}
              width={120}
              height={180}
              label={`Frasco de ${PRODUCTO.nombre}`}
            />
          )}
          <div className="sheet-title">
            <p className="kicker">Conoce el producto</p>
            <h2 id="producto-titulo">{PRODUCTO.nombre}</h2>
            <p className="sheet-sub">{PRODUCTO.bajada}</p>
            <p className="distribuido">
              Distribuido por
              <Image className="inti-logo" src={PRODUCTO.logoDistribuidor} alt={PRODUCTO.distribuidor} sizes="80px" />
            </p>
          </div>
          <button ref={closeRef} className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>

        <div className="sheet-body">
          {PRODUCTO.secciones.map((s) => (
            <details key={s.titulo} className="sheet-section" open={s.abierta}>
              <summary>{s.titulo}</summary>
              <ul>
                {s.puntos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          ))}
          <p className="fineprint">{PRODUCTO.pie}</p>
          <p className="fineprint">{AVISO_FANTASIA}</p>
        </div>

        <button className="btn btn-primary sheet-done" onClick={onClose}>
          Volver
        </button>
      </section>
    </div>
  );
}
