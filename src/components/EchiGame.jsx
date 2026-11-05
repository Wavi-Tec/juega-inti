'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Game } from '@/game/engine';
import { Scene } from '@/game/scene';
import { sound } from '@/game/audio';
import { drawFinale, loadImage } from '@/game/art';
import { GAME_DURATION, PHASES, CREATURE_TYPES } from '@/game/config';
import { subscribe, getRecord, getSoundOn, saveRecord, saveSoundOn } from '@/game/storage';
import { MENSAJES_CLIMA, FRASE_PRESENTADOR, AVISO_FANTASIA_CORTO, PRODUCTO } from '@/content/producto';
import ArtCanvas from './ArtCanvas';
import ProductPanel from './ProductPanel';
import {
  PlayIcon,
  PauseIcon,
  SoundOnIcon,
  SoundOffIcon,
  FlowerIcon,
  CreatureIcon,
  RingIcon,
  PetalShieldIcon,
} from './icons';

const COUNTDOWN = 3; // segundos antes de empezar
const FINAL_DELAY = 1.9; // celebración antes de mostrar el resultado
const TOAST_TIME = 5.5; // segundos visibles del mensaje de cada clima
const EMPTY_HUD = { score: 0, streak: 0, secondsLeft: GAME_DURATION, phase: 0 };

// Modos: 'inicio' | 'cuenta' | 'partida' | 'pausa' | 'final' | 'resultado'

const formatTime = (s) => `0:${String(s).padStart(2, '0')}`;
const vibrate = (ms) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // no disponible
  }
};
const serverFalse = () => 0;
const serverTrue = () => true;

// Escena final con la foto real del producto entre Echi y la persona.
const productSrc = PRODUCTO.imagenFrasco?.src ?? null;
const drawFinaleArt = (ctx, w, h, t, font) => drawFinale(ctx, w, h, t, font, productSrc);

// Carteles y frasco gigante junto al camino.
const brandArt = {
  product: productSrc,
  logo: PRODUCTO.logoDistribuidor?.src ?? null,
  bottleCrop: productSrc ? PRODUCTO.recorteFrasco : null,
};

export default function EchiGame() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const buttonRef = useRef(null);
  const timeRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const modeRef = useRef('inicio');
  const pausedFromRef = useRef('partida');
  const loopRef = useRef({ countdown: 0, count: null, goUntil: 0, toastUntil: 0, finalT: 0, summary: null, hud: EMPTY_HUD });

  const [mode, setModeState] = useState('inicio');
  const [hud, setHud] = useState(EMPTY_HUD);
  const [count, setCount] = useState(null);
  const [toast, setToast] = useState(null);
  const [rush, setRush] = useState(false);
  const [result, setResult] = useState(null);
  const [showProduct, setShowProduct] = useState(false);

  const record = useSyncExternalStore(subscribe, getRecord, serverFalse);
  const soundOn = useSyncExternalStore(subscribe, getSoundOn, serverTrue);

  const setMode = useCallback((m) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  // ── Bucle principal ──────────────────────────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const font = getComputedStyle(stage).getPropertyValue('--font-display').trim() || 'sans-serif';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const game = new Game();
    const scene = new Scene(canvas, { font, reducedMotion, brand: brandArt });
    gameRef.current = game;
    sceneRef.current = scene;
    sound.setEnabled(getSoundOn());
    // Se precargan para los carteles del camino y la escena final.
    loadImage(productSrc);
    loadImage(brandArt.logo);

    // Solo para pruebas: /?debug expone el estado en window.__echi
    if (new URLSearchParams(window.location.search).has('debug')) {
      window.__echi = { game, scene, mode: () => modeRef.current };
    }

    // El lienzo ocupa toda la ventana; la columna 9:16 (stage) marca dónde va la jugabilidad.
    const fit = () => {
      const c = canvas.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      scene.resize(c.width, c.height, window.devicePixelRatio || 1, {
        left: s.left - c.left,
        top: s.top - c.top,
        width: s.width,
        height: s.height,
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    ro.observe(canvas);
    window.addEventListener('resize', fit);

    const L = loopRef.current;

    const onEvents = (events) => {
      scene.handle(events);
      for (const e of events) {
        if (e.type === 'phase') {
          L.toastUntil = game.time + TOAST_TIME;
          setToast({ index: e.index });
          if (e.index > 0) sound.phase(e.index);
        } else if (e.type === 'shield') {
          // Los toques directos ya sonaron al tocar; aquí solo los guardados durante la recarga.
          if (e.buffered) sound.shield();
        } else if (e.type === 'block') {
          sound.block(e.streak, e.perfect);
          if (e.kind === 2) sound.golden();
          if (e.bloomUp) sound.bloom(e.bloom);
          vibrate(12);
        } else if (e.type === 'group') {
          sound.group(e.size);
          vibrate([15, 40, 25]);
        } else if (e.type === 'spawn') {
          if (e.creature.type === 2) sound.goldenSpawn();
        } else if (e.type === 'rush') {
          sound.rush();
          sound.setRush(true);
          setRush(true);
        } else if (e.type === 'miss') {
          sound.miss();
          vibrate(30);
        } else if (e.type === 'zone') {
          sound.zone();
        } else if (e.type === 'tick') {
          sound.tick(e.secondsLeft);
        } else if (e.type === 'end') {
          sound.finish();
          sound.setRush(false);
          sound.setCombo(0);
          L.summary = e.summary;
          L.finalT = FINAL_DELAY;
          L.toastUntil = 0;
          setToast(null);
          setMode('final');
        }
      }
    };

    const syncHud = () => {
      const next = {
        score: game.score,
        streak: game.streak,
        secondsLeft: Math.ceil(game.timeLeft),
        phase: game.phase,
      };
      const prev = L.hud;
      if (
        next.score !== prev.score ||
        next.streak !== prev.streak ||
        next.secondsLeft !== prev.secondsLeft ||
        next.phase !== prev.phase
      ) {
        L.hud = next;
        setHud(next);
      }
      sound.setCombo(game.bloom);
      // Lo que cambia en cada cuadro va directo al DOM para no re-renderizar React.
      timeRef.current?.style.setProperty('--progress', (game.time / GAME_DURATION).toFixed(4));
      const btn = buttonRef.current;
      if (btn) {
        btn.style.setProperty('--charge', game.shieldCharge.toFixed(3));
        btn.classList.toggle('is-now', game.anyInZone() && !game.shield.active);
        btn.classList.toggle('is-open', game.shield.active);
      }
      if (L.toastUntil && game.time > L.toastUntil) {
        L.toastUntil = 0;
        setToast(null);
      }
      if (L.goUntil && game.time > L.goUntil) {
        L.goUntil = 0;
        setCount(null);
      }
    };

    let raf = 0;
    let last = performance.now();
    let slowFrames = 0;
    const frame = (now) => {
      const rawDt = (now - last) / 1000;
      const dt = Math.min(0.05, rawDt);
      last = now;
      const m = modeRef.current;

      // Calidad adaptativa: si el equipo no sostiene ~40 fps, baja la resolución interna del lienzo.
      if (rawDt > 1 / 40 && rawDt < 0.5) slowFrames += 1;
      else slowFrames = Math.max(0, slowFrames - 2);
      if (slowFrames > 90 && scene.quality > 0.55) {
        scene.quality *= 0.8;
        slowFrames = 0;
        fit();
      }

      if (m === 'cuenta') {
        L.countdown -= dt;
        if (L.countdown <= 0) {
          game.start();
          L.goUntil = 0.8;
          setCount(0);
          sound.count(0);
          setMode('partida');
        } else {
          const n = Math.ceil(L.countdown);
          if (n !== L.count) {
            L.count = n;
            setCount(n);
            sound.count(n);
          }
        }
      } else if (m === 'partida') {
        const events = game.update(dt);
        if (events.length) onEvents(events);
        syncHud();
      } else if (m === 'final') {
        L.finalT -= dt;
        if (L.finalT <= 0) {
          const s = L.summary;
          const previous = getRecord();
          const isRecord = saveRecord(s.score);
          setResult({ ...s, isRecord, previous });
          setMode('resultado');
        }
      }

      if (m !== 'pausa') {
        scene.update(dt, game, m);
        sound.setWeather(scene.weights);
      }
      scene.render(game, m, { hint: m === 'partida' && game.time < 20 && game.blocks < 2 });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
      sound.stopMusic();
    };
  }, [setMode]);

  // ── Acciones ─────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    sound.unlock();
    sound.setEnabled(getSoundOn());
    sound.resume();
    sound.startMusic();
    sound.setRush(false);
    sound.setCombo(0);
    sound.ui();
    gameRef.current.reset();
    sceneRef.current.reset();
    Object.assign(loopRef.current, {
      countdown: COUNTDOWN,
      count: null,
      goUntil: 0,
      toastUntil: 0,
      finalT: 0,
      summary: null,
      hud: EMPTY_HUD,
    });
    setHud(EMPTY_HUD);
    setToast(null);
    setRush(false);
    setResult(null);
    setCount(null);
    setShowProduct(false);
    setMode('cuenta');
  }, [setMode]);

  const activate = useCallback(() => {
    if (modeRef.current !== 'partida') return;
    const r = gameRef.current.activateShield();
    if (r === 'ok') sound.shield();
    else if (r === 'busy') sound.busy();
    // 'buffered': el escudo se abrirá solo al terminar la recarga.
  }, []);

  const pause = useCallback(() => {
    const m = modeRef.current;
    if (m !== 'partida' && m !== 'cuenta') return;
    pausedFromRef.current = m;
    sound.pause();
    setMode('pausa');
  }, [setMode]);

  const resume = useCallback(() => {
    if (modeRef.current !== 'pausa') return;
    sound.resume();
    setMode(pausedFromRef.current);
  }, [setMode]);

  const exitToStart = useCallback(() => {
    sound.resume();
    sound.setRush(false);
    sound.setCombo(0);
    gameRef.current.reset();
    sceneRef.current.reset();
    loopRef.current.toastUntil = 0;
    setToast(null);
    setRush(false);
    setCount(null);
    setMode('inicio');
  }, [setMode]);

  const toggleSound = useCallback(() => {
    const on = !getSoundOn();
    saveSoundOn(on);
    sound.unlock();
    sound.setEnabled(on);
    if (on && modeRef.current !== 'inicio') sound.startMusic();
    sound.ui();
  }, []);

  const openProduct = useCallback(() => {
    sound.ui();
    setShowProduct(true);
  }, []);
  const closeProduct = useCallback(() => setShowProduct(false), []);

  const onCanvasPointer = useCallback(
    (e) => {
      const scene = sceneRef.current;
      const rect = canvasRef.current.getBoundingClientRect();
      const p = scene.toLogical(e.clientX, e.clientY, rect);
      if (!scene.hitsEchi(p.x, p.y)) return;
      if (modeRef.current === 'partida') {
        e.preventDefault();
        activate();
      } else if (modeRef.current === 'inicio') {
        // En la portada Echi saluda al tocarlo.
        scene.echi.tapAge = 0;
        scene.setEchi('happy', 0.8);
      }
    },
    [activate]
  );

  // Botón de escudo: responde al tocar (pointerdown) sin esperar al clic; el teclado usa click.
  const onShieldPointer = useCallback(
    (e) => {
      e.preventDefault();
      activate();
    },
    [activate]
  );
  const onShieldClick = useCallback(
    (e) => {
      if (e.detail === 0) activate();
    },
    [activate]
  );

  useEffect(() => {
    const onKey = (e) => {
      const m = modeRef.current;
      if ((e.code === 'Space' || e.code === 'Enter') && m === 'partida') {
        e.preventDefault();
        activate();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (m === 'partida' || m === 'cuenta') pause();
        else if (m === 'pausa') resume();
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activate, pause, resume]);

  // ── Interfaz ─────────────────────────────────────────────────────────────

  const inGame = mode === 'cuenta' || mode === 'partida' || mode === 'pausa' || mode === 'final';
  const mensaje = toast ? MENSAJES_CLIMA[toast.index] : null;

  return (
    <main className={`app ${mode === 'pausa' ? 'dim-pausa' : ''} ${showProduct ? 'dim-producto' : ''}`}>
      <canvas
        ref={canvasRef}
        className="world-canvas"
        onPointerDown={onCanvasPointer}
        role="img"
        aria-label="Una persona camina por un jardín junto a Echi, una flor de equinácea, mientras cambia el clima."
      />
      <div className={`stage mode-${mode}`} ref={stageRef}>

        {inGame && (
          <header className="hud">
            <div className="hud-score">
              <span className="hud-label">Puntos</span>
              <strong key={hud.score} className="hud-score-num">
                {hud.score}
              </strong>
              <div className="hud-streak" aria-label={`Racha de ${hud.streak}`}>
                {hud.streak >= 3 ? (
                  <span className="streak-chip">Racha {hud.streak}</span>
                ) : (
                  [0, 1, 2].map((i) => (
                    <span key={i} className={`streak-pip ${i < hud.streak ? 'is-on' : ''}`} />
                  ))
                )}
              </div>
            </div>

            <div className="hud-time" ref={timeRef}>
              <span className={`hud-clock ${hud.secondsLeft <= 5 ? 'is-ending' : ''}`}>
                {formatTime(hud.secondsLeft)}
              </span>
              <div className="hud-track" aria-hidden="true">
                <div className="hud-track-fill" />
                {PHASES.map((p, i) => (
                  <span
                    key={p.id}
                    className={`hud-seg ${i === hud.phase ? 'is-current' : ''} ${i < hud.phase ? 'is-done' : ''}`}
                  >
                    {MENSAJES_CLIMA[i].icono}
                  </span>
                ))}
              </div>
              {rush && mode !== 'final' && <span className="rush-chip">Ráfaga final</span>}
            </div>

            <div className="hud-actions">
              <button
                className="icon-btn"
                onClick={toggleSound}
                aria-label={soundOn ? 'Silenciar' : 'Activar sonido'}
              >
                {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
              </button>
              <button className="icon-btn" onClick={pause} aria-label="Pausar" disabled={mode === 'final'}>
                <PauseIcon />
              </button>
            </div>
          </header>
        )}

        {mensaje && (mode === 'partida' || mode === 'pausa') && (
          <div className="toast" key={toast.index} role="status" aria-live="polite">
            <span className="toast-icon" aria-hidden="true">
              {mensaje.icono}
            </span>
            <div>
              <span className="toast-stage">
                Etapa {toast.index + 1} · {mensaje.etapa}
              </span>
              <p className="toast-text">{mensaje.texto}</p>
            </div>
          </div>
        )}

        {count !== null && (mode === 'cuenta' || mode === 'partida') && (
          <div className="countdown" aria-live="assertive">
            <span key={count} className={`countdown-num ${count > 0 ? '' : 'is-go'}`}>
              {count > 0 ? count : '¡A caminar!'}
            </span>
            {mode === 'cuenta' && <p className="countdown-tip">Toca a Echi cuando una criatura brille</p>}
          </div>
        )}

        {inGame && (
          <div className="shield-dock">
            <button
              ref={buttonRef}
              className="shield-btn"
              onPointerDown={onShieldPointer}
              onClick={onShieldClick}
              disabled={mode !== 'partida'}
            >
              <span className="shield-btn-icon" aria-hidden="true">
                <PetalShieldIcon />
              </span>
              <span className="shield-btn-label">Activar escudo</span>
              <span className="shield-btn-now" aria-hidden="true">
                ¡Ahora!
              </span>
            </button>
          </div>
        )}

        {mode === 'inicio' && (
          <section className="screen screen-start">
            <div className="card start-card">
              <div className="brand-row">
                <p className="brand-chip">
                  <FlowerIcon /> {PRODUCTO.nombre}
                </p>
                <Image
                  className="inti-logo"
                  src={PRODUCTO.logoDistribuidor}
                  alt={PRODUCTO.distribuidor}
                  sizes="80px"
                  preload
                />
              </div>
              <h1 className="title">
                <span className="title-main">Echi</span>
                <span className="title-sub">te acompaña</span>
              </h1>
              <ol className="how">
                <li>
                  <CreatureIcon />
                  <span>Se acercan</span>
                </li>
                <li>
                  <RingIcon />
                  <span>Brillan</span>
                </li>
                <li>
                  <FlowerIcon />
                  <span>¡Toca a Echi!</span>
                </li>
              </ol>
              <ul className="legend" aria-label="Puntos por virus">
                {CREATURE_TYPES.map((t) => (
                  <li key={t.id} className={`legend-${t.id}`}>
                    <CreatureIcon variant={t.id} />
                    <span>
                      <strong>+{t.points}</strong> {t.name.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary btn-xl" onClick={startGame}>
                <PlayIcon /> Jugar
              </button>
              <div className="start-row">
                <button className="chip-btn" onClick={toggleSound} aria-pressed={soundOn}>
                  {soundOn ? <SoundOnIcon /> : <SoundOffIcon />} Sonido {soundOn ? 'sí' : 'no'}
                </button>
                <span className="chip">Récord: {record}</span>
              </div>
            </div>
            <div className="start-footer">
              <button className="btn btn-secondary btn-sm" onClick={openProduct}>
                Conoce el producto
              </button>
              <p className="presenter-note">
                <strong>Para quien presenta:</strong> «{FRASE_PRESENTADOR}».
              </p>
            </div>
          </section>
        )}

        {mode === 'pausa' && (
          <section className="screen screen-dim">
            <div className="card pause-card">
              <h2 className="card-title">Pausa</h2>
              <p className="card-text">El tiempo está detenido.</p>
              <button className="btn btn-primary btn-xl" onClick={resume}>
                <PlayIcon /> Continuar
              </button>
              <button className="btn btn-secondary" onClick={startGame}>
                Reiniciar
              </button>
              <button className="btn btn-ghost" onClick={toggleSound} aria-pressed={soundOn}>
                {soundOn ? <SoundOnIcon /> : <SoundOffIcon />} Sonido {soundOn ? 'sí' : 'no'}
              </button>
              <button className="btn btn-ghost" onClick={exitToStart}>
                Salir al inicio
              </button>
            </div>
          </section>
        )}

        {mode === 'resultado' && result && (
          <section className="screen screen-result">
            <div className="card result-card">
              <p className="kicker">¡Paseo completado!</p>
              <ArtCanvas
                className="finale-art"
                draw={drawFinaleArt}
                width={340}
                height={250}
                label="Echi junto a la persona y el frasco de Echinacea Médica"
              />
              <p className="distribuido">
                Distribuido por
                <Image className="inti-logo" src={PRODUCTO.logoDistribuidor} alt={PRODUCTO.distribuidor} sizes="80px" />
              </p>
              <div className="result-score">
                <div className="result-score-num">
                  <span className="hud-label">Puntos</span>
                  <strong>{result.score}</strong>
                </div>
                {result.isRecord ? (
                  <span className="badge">¡Nuevo récord!</span>
                ) : (
                  <span className="muted">Récord: {record}</span>
                )}
              </div>
              <ul className="result-chips" aria-label="Resumen de la partida">
                {CREATURE_TYPES.map((t, i) => (
                  <li
                    key={t.id}
                    className={`result-type-${t.id}`}
                    aria-label={`${result.byType[i]} ${t.name.toLowerCase()} (+${t.points} cada uno)`}
                  >
                    <CreatureIcon variant={t.id} />
                    <strong>{result.byType[i]}</strong>
                  </li>
                ))}
                <li className="result-streak" aria-label={`Mejor racha: ${result.bestStreak}`}>
                  <span>racha</span>
                  <strong>{result.bestStreak}</strong>
                </li>
              </ul>
              <div className="result-actions">
                <button className="btn btn-primary btn-xl" onClick={startGame}>
                  Jugar otra vez
                </button>
                <button className="btn btn-secondary" onClick={openProduct}>
                  Conoce el producto
                </button>
              </div>
              <p className="fineprint">{AVISO_FANTASIA_CORTO}</p>
            </div>
          </section>
        )}

        {showProduct && <ProductPanel onClose={closeProduct} />}
      </div>

      <div className="rotate-hint">
        <FlowerIcon />
        <p>Gira el teléfono en vertical para jugar</p>
      </div>
    </main>
  );
}
