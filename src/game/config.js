// Parámetros de juego. Todo el balance vive aquí para poder ajustarlo sin tocar la lógica.

export const GAME_DURATION = 60; // segundos de partida

// Tres etapas automáticas por tiempo. `speed` en unidades lógicas/s, `travel` = segundos
// desde que aparece una criatura hasta que llega al escudo. `interval` separa la última
// llegada de un grupo de la primera del siguiente; `gap` separa llegadas dentro del grupo.
// `types` = probabilidad de cada tipo de virus (común, veloz, dorado) en la etapa.
export const PHASES = [
  {
    id: 'nublado',
    name: 'Nublado',
    start: 0,
    end: 20,
    speed: 95,
    travel: 3.6,
    interval: [2.0, 2.4],
    groups: [[1, 0.8], [2, 0.2]],
    gap: [0.15, 0.25],
    types: [0.75, 0.25, 0],
  },
  {
    id: 'lluvia',
    name: 'Lluvia',
    start: 20,
    end: 40,
    speed: 140,
    travel: 2.9,
    interval: [1.35, 1.65],
    groups: [[1, 0.4], [2, 0.42], [3, 0.18]],
    gap: [0.12, 0.22],
    types: [0.55, 0.33, 0.12],
  },
  {
    id: 'nieve',
    name: 'Nieve',
    start: 40,
    end: 60,
    speed: 165,
    travel: 2.5,
    interval: [1.45, 1.8],
    groups: [[2, 0.25], [3, 0.4], [4, 0.25], [5, 0.1]],
    gap: [0.08, 0.11],
    types: [0.45, 0.35, 0.2],
  },
];

// Tipos de virus. `points` es exactamente lo que suma bloquear uno: no hay multiplicadores.
// `motion`: 'lineal' avanza parejo; 'acelera' zigzaguea y se apura al final;
// 'finta' se detiene a medio camino y luego se lanza.
export const CREATURE_TYPES = [
  { id: 'comun', name: 'Común', points: 1, size: 1, motion: 'lineal' },
  { id: 'veloz', name: 'Veloz', points: 2, size: 0.78, motion: 'acelera' },
  { id: 'dorado', name: 'Dorado', points: 3, size: 1.12, motion: 'finta' },
];

// Los primeros segundos solo llegan virus comunes y de uno en uno, para aprender.
export const INTRO_TIME = 10;

export const SHIELD = {
  duration: 1.0, // segundos que el escudo permanece abierto
  cooldown: 0.35, // recarga tras cerrarse (evita mantenerlo abierto tocando sin parar)
  radius: 155, // radio visual del escudo
  hitRadius: 168, // distancia al centro a la que una criatura "llega" al escudo
};

// Una criatura está en la zona ideal cuando le faltan menos de ZONE_TIME segundos para llegar.
// ZONE_TIME + mayor separación de un grupo < duración del escudo: tocar al brillar siempre bloquea.
export const ZONE_TIME = 0.5;
// El aro de aviso aparece antes, para anticipar el momento.
export const RING_TIME = 1.3;
// «¡Perfecto!» exige esperar a que el aro se cierre: tocar en los últimos PERFECT_TIME segundos.
export const PERFECT_TIME = 0.25;
// Un toque hecho cuando a la recarga le falta menos que esto se guarda y se usa al terminar.
export const INPUT_BUFFER = 0.2;

// Ráfaga final: los últimos segundos se celebran con música más rápida y marco dorado.
export const RUSH = { start: 50 };

export const STREAK_BLOOM = 3; // bloqueos seguidos para que florezca el escudo

export const SPAWN = {
  firstImpact: 5.0, // la primera criatura aparece ~1,4 s después de empezar
  angleMin: (-140 * Math.PI) / 180,
  angleMax: (-40 * Math.PI) / 180,
  endMargin: 0.4, // no se programan llegadas en los últimos 0,4 s
};

export function phaseIndexAt(t) {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (t >= PHASES[i].start) return i;
  }
  return 0;
}

// La racha no da puntos extra: hace florecer el escudo (y la música) cada vez más.
export function bloomLevelFor(streak) {
  if (streak >= 10) return 3;
  if (streak >= 6) return 2;
  if (streak >= STREAK_BLOOM) return 1;
  return 0;
}
