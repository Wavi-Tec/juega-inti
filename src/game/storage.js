// Récord y preferencia de sonido guardados en el navegador.
// Expone subscribe/getters para useSyncExternalStore. Si localStorage no está disponible
// (modo privado, bloqueado), los valores viven en memoria durante la sesión.

// v3: cada virus suma 1, 2 o 3 puntos sin multiplicadores; los récords de escalas anteriores no se comparan.
const RECORD_KEY = 'echi-te-acompana:record-v3';
const SOUND_KEY = 'echi-te-acompana:sonido';

const memory = new Map();
const listeners = new Set();

function read(key) {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    // sin acceso a localStorage
  }
  return memory.has(key) ? memory.get(key) : null;
}

function write(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // se conserva en memoria
  }
  listeners.forEach((cb) => cb());
}

export function subscribe(cb) {
  listeners.add(cb);
  const onStorage = (e) => {
    if (e.key === RECORD_KEY || e.key === SOUND_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function getRecord() {
  return Number(read(RECORD_KEY)) || 0;
}

export function getSoundOn() {
  return read(SOUND_KEY) !== '0';
}

/** Guarda la puntuación si supera el récord. Devuelve true si es un récord nuevo. */
export function saveRecord(score) {
  if (score <= getRecord()) return false;
  write(RECORD_KEY, String(score));
  return true;
}

export function saveSoundOn(on) {
  write(SOUND_KEY, on ? '1' : '0');
}
