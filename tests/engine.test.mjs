// Pruebas del motor de juego: `npm test`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, createRng } from '../src/game/engine.js';
import {
  GAME_DURATION,
  SHIELD,
  PERFECT_TIME,
  RUSH,
  CREATURE_TYPES,
  INTRO_TIME,
  phaseIndexAt,
  bloomLevelFor,
} from '../src/game/config.js';

// Puntos de un bloqueo: exactamente 1, 2 o 3 según el virus, sin multiplicadores.
const expectedPoints = (b) => CREATURE_TYPES[b.kind].points;

const DT = 1 / 60;

// Simula una partida completa. `onFrame(game)` permite que un "jugador" actúe cada cuadro.
function play({ seed = 7, onFrame = () => {}, dt = DT } = {}) {
  const game = new Game({ rng: createRng(seed) });
  game.start();
  const events = [];
  let frames = 0;
  while (game.state === 'playing' && frames < 100000) {
    onFrame(game);
    for (const e of game.update(dt)) events.push({ ...e, at: game.time });
    frames++;
  }
  return { game, events, frames };
}

const nextImpact = (g) =>
  Math.min(...g.creatures.filter((c) => c.state === 'approach').map((c) => g.timeToImpact(c)));

// Toca en cuanto una criatura brilla (lo que enseña el juego).
const glowPlayer = (g) => {
  if (g.anyInZone() && !g.shieldBusy()) g.activateShield();
};
// Espera a que el aro se cierre y toca en el último momento (jugador hábil).
const sharpPlayer = (g) => {
  if (!g.shieldBusy() && nextImpact(g) <= PERFECT_TIME - 0.08) g.activateShield();
};

test('el temporizador dura exactamente 60 s y termina la partida', () => {
  const { game, events, frames } = play();
  assert.equal(game.state, 'ended');
  assert.equal(game.time, GAME_DURATION);
  assert.equal(game.timeLeft, 0);
  assert.ok(Math.abs(frames - GAME_DURATION * 60) <= 1, `cuadros: ${frames}`);
  assert.equal(events.filter((e) => e.type === 'end').length, 1);
  game.update(1);
  assert.equal(game.time, GAME_DURATION, 'una vez terminada, update() ya no avanza el reloj');
});

test('cuenta regresiva audible en los últimos 5 segundos', () => {
  const { events } = play();
  const ticks = events.filter((e) => e.type === 'tick').map((e) => e.secondsLeft);
  assert.deepEqual(ticks, [5, 4, 3, 2, 1]);
});

test('las tres etapas cambian en 0, 20 y 40 s, y la ráfaga final empieza a los 50 s', () => {
  assert.equal(phaseIndexAt(0), 0);
  assert.equal(phaseIndexAt(19.99), 0);
  assert.equal(phaseIndexAt(20), 1);
  assert.equal(phaseIndexAt(39.99), 1);
  assert.equal(phaseIndexAt(40), 2);
  assert.equal(phaseIndexAt(59.99), 2);

  const { events } = play();
  const phases = events.filter((e) => e.type === 'phase');
  assert.deepEqual(
    phases.map((e) => e.index),
    [0, 1, 2]
  );
  assert.ok(phases[1].at >= 20 && phases[1].at < 20 + 2 * DT);
  assert.ok(phases[2].at >= 40 && phases[2].at < 40 + 2 * DT);
  const rush = events.filter((e) => e.type === 'rush');
  assert.equal(rush.length, 1);
  assert.ok(rush[0].at >= RUSH.start && rush[0].at < RUSH.start + 2 * DT);
});

test('la dificultad sube: más criaturas y más rápidas en cada etapa', () => {
  const { events } = play({ seed: 3 });
  const spawns = events.filter((e) => e.type === 'spawn').map((e) => e.creature);
  const byPhase = [0, 1, 2].map((p) => spawns.filter((c) => c.phase === p));
  const avgSpeed = (list) => list.reduce((s, c) => s + c.speed, 0) / list.length;

  assert.ok(byPhase[0].length >= 7, `nublado: ${byPhase[0].length}`);
  assert.ok(byPhase[0].length < byPhase[1].length, 'lluvia trae más criaturas que nublado');
  assert.ok(byPhase[1].length < byPhase[2].length, 'nieve trae más criaturas que lluvia');
  assert.ok(avgSpeed(byPhase[0]) < avgSpeed(byPhase[1]));
  assert.ok(avgSpeed(byPhase[1]) < avgSpeed(byPhase[2]));

  const snowImpacts = byPhase[2].map((c) => c.impactAt).sort((a, b) => a - b);
  const closePairs = snowImpacts.slice(1).filter((t, i) => t - snowImpacts[i] < 0.5).length;
  assert.ok(closePairs >= 5, `llegadas casi juntas en nieve: ${closePairs}`);
  assert.ok(spawns.every((c) => c.impactAt <= GAME_DURATION));
});

test('sin tocar: cada criatura es un fallo «toca cuando brille», sin puntos, hasta los 60 s', () => {
  const { game, events } = play();
  const misses = events.filter((e) => e.type === 'miss');
  assert.ok(misses.length > 20);
  assert.ok(misses.every((m) => m.reason === 'none'));
  assert.equal(game.score, 0);
  assert.equal(game.blocks, 0);
  assert.equal(game.bestStreak, 0);
  assert.equal(game.misses, misses.length);
  assert.ok(misses[0].at < 10, 'el primer fallo ocurre pronto…');
  assert.equal(game.time, GAME_DURATION, '…y aun así la partida llega al final');
});

test('tocar al brillar nunca falla; la racha hace florecer el escudo', () => {
  const { game, events } = play({ onFrame: glowPlayer });
  const blocks = events.filter((e) => e.type === 'block');

  assert.equal(game.misses, 0);
  assert.ok(blocks.length > 30, `bloqueos: ${blocks.length}`);
  assert.equal(game.bestStreak, blocks.length);

  const sum = blocks.reduce((s, b) => s + b.points, 0);
  assert.equal(game.score, sum, 'la puntuación es solo la suma de los virus bloqueados');
  const byPoints = game.byType.reduce((s, n, i) => s + n * CREATURE_TYPES[i].points, 0);
  assert.equal(game.score, byPoints, 'puntos = comunes×1 + veloces×2 + dorados×3');

  assert.equal(blocks[1].bloomUp, false);
  assert.equal(blocks[2].streak, 3);
  assert.equal(blocks[2].bloomUp, true);
  assert.equal(blocks[5].bloom, 2);
  assert.equal(blocks[9].bloom, 3);
});

test('«¡Perfecto!» se celebra pero no cambia los puntos', () => {
  const glow = play({ onFrame: glowPlayer });
  const sharp = play({ onFrame: sharpPlayer });
  assert.equal(sharp.game.misses, 0, 'tocar al final del aro también bloquea todo');
  assert.ok(glow.game.perfects < sharp.game.perfects, `${glow.game.perfects} < ${sharp.game.perfects}`);
  assert.equal(glow.game.score, sharp.game.score, 'mismos virus bloqueados = mismos puntos');
  for (const b of sharp.events.filter((e) => e.type === 'block')) assert.equal(b.points, expectedPoints(b));
});

test('cada virus vale 1, 2 o 3 puntos según su tipo', () => {
  assert.deepEqual(
    CREATURE_TYPES.map((t) => t.points),
    [1, 2, 3]
  );
  // Con racha larga, perfectos y ráfaga final, cada virus sigue valiendo lo mismo.
  const { events } = play({ onFrame: sharpPlayer });
  const blocks = events.filter((e) => e.type === 'block');
  assert.ok(blocks.some((b) => b.streak >= 15 && b.perfect && b.rush), 'hubo racha, perfecto y ráfaga');
  for (const b of blocks) assert.equal(b.points, CREATURE_TYPES[b.kind].points);
  assert.deepEqual([...new Set(blocks.map((b) => b.points))].sort(), [1, 2, 3]);
});

test('los tipos de virus aparecen según la etapa', () => {
  const counts = [0, 1, 2].map(() => [0, 0, 0]);
  for (let seed = 1; seed <= 20; seed++) {
    const { events } = play({ seed });
    const spawns = events.filter((e) => e.type === 'spawn');
    for (const e of spawns) {
      counts[e.creature.phase][e.creature.type] += 1;
      if (e.at < INTRO_TIME) assert.equal(e.creature.type, 0, 'al principio solo comunes');
    }
    // Como mucho un dorado por grupo.
    const goldPerGroup = new Map();
    for (const e of spawns.filter((x) => x.creature.type === 2)) {
      goldPerGroup.set(e.creature.group, (goldPerGroup.get(e.creature.group) || 0) + 1);
    }
    assert.ok([...goldPerGroup.values()].every((v) => v === 1));
  }
  assert.equal(counts[0][2], 0, 'en nublado no hay dorados');
  assert.ok(counts[0][1] > 0, 'en nublado ya aparecen veloces');
  assert.ok(counts[1][2] > 0 && counts[2][2] > 0, 'dorados en lluvia y nieve');
  const share = (p, t) => counts[p][t] / counts[p].reduce((a, b) => a + b, 0);
  assert.ok(share(2, 2) > share(1, 2), 'más dorados en nieve que en lluvia');
});

test('movimientos: el veloz acelera y el dorado se detiene, pero todos llegan cuando marca el aro', () => {
  const { events } = play({ seed: 4, onFrame: glowPlayer });
  const spawned = events.filter((e) => e.type === 'spawn').map((e) => e.creature);
  assert.ok(spawned.some((c) => c.type === 1) && spawned.some((c) => c.type === 2));
  // Cada impacto ocurre en el cuadro de su `impactAt`.
  for (const e of events.filter((x) => x.type === 'block' || x.type === 'miss')) {
    assert.ok(e.at >= e.creature.impactAt && e.at < e.creature.impactAt + 2 * DT, `${e.at} vs ${e.creature.impactAt}`);
  }

  // Trayectorias muestreadas en una partida aparte.
  const game = new Game({ rng: createRng(4) });
  game.start();
  const tracks = new Map();
  while (game.state === 'playing') {
    game.update(DT);
    for (const c of game.creatures) {
      if (c.state !== 'approach') continue;
      if (!tracks.has(c.id)) tracks.set(c.id, { c, d: [] });
      tracks.get(c.id).d.push(c.dist);
    }
  }
  let hovered = 0;
  for (const { c, d } of tracks.values()) {
    for (let i = 1; i < d.length; i++) assert.ok(d[i] <= d[i - 1] + 1e-9, 'nunca retrocede');
    assert.ok(d.every((x) => x >= SHIELD.hitRadius));
    const steps = d.slice(1).map((x, i) => d[i] - x);
    const early = steps.slice(0, 10).reduce((a, b) => a + b, 0);
    const late = steps.slice(-10).reduce((a, b) => a + b, 0);
    if (c.type === 1 && d.length > 40) assert.ok(late > early * 1.4, 'el veloz acelera al final');
    if (c.type === 2 && d.length > 60) {
      const still = steps.filter((s) => s < 1e-9).length;
      if (still > 10) hovered++;
      assert.ok(late > early * 1.6, 'el dorado se lanza al final');
    }
  }
  assert.ok(hovered > 0, 'el dorado se queda quieto un momento');
});

test('«¡Grupo completo!» solo si se bloquea el grupo entero, sin puntos extra', () => {
  // Jugador irregular: a veces toca bien y a veces se olvida, para tener grupos mixtos.
  const r = createRng(99);
  const { events } = play({
    seed: 11,
    onFrame: (g) => {
      if (g.anyInZone() && !g.shieldBusy() && r() < 0.04) g.activateShield();
    },
  });
  const outcome = new Map();
  for (const e of events) {
    if (e.type === 'block' || e.type === 'miss') {
      const list = outcome.get(e.creature.group) || [];
      list.push(e.type);
      outcome.set(e.creature.group, list);
    }
  }
  const bonusGroups = new Set(events.filter((e) => e.type === 'group').map((e) => e.creature.group));
  let complete = 0;
  let mixed = 0;
  for (const [group, list] of outcome) {
    const all = list.length >= 2 && list.every((x) => x === 'block');
    if (all) complete++;
    if (list.length >= 2 && !all) mixed++;
    assert.equal(bonusGroups.has(group), all, `grupo ${group}: ${list.join(',')}`);
  }
  assert.ok(complete > 0 && mixed > 0, `completos ${complete}, mixtos ${mixed}`);
  const blockSum = events.filter((e) => e.type === 'block').reduce((s, b) => s + b.points, 0);
  const last = events.find((e) => e.type === 'end');
  assert.equal(last.summary.score, blockSum, 'el grupo completo no suma puntos');
});

test('ráfaga final desde los 50 s, sin cambiar los puntos', () => {
  const { events } = play({ onFrame: sharpPlayer });
  for (const b of events.filter((e) => e.type === 'block')) {
    assert.equal(b.points, expectedPoints(b));
    assert.equal(b.rush, b.at >= RUSH.start);
  }
  assert.ok(events.some((e) => e.type === 'block' && e.rush));
});

test('el fallo explica la causa: «muy pronto» y «un poco tarde»', () => {
  // Toca demasiado pronto: el escudo se cierra antes de que llegue la criatura.
  const early = play({
    onFrame: (g) => {
      if (!g.shieldBusy() && nextImpact(g) > 1.15 && nextImpact(g) <= 1.25) g.activateShield();
    },
  });
  const misses = early.events.filter((e) => e.type === 'miss');
  assert.ok(misses.some((m) => m.reason === 'early'), 'hay fallos por tocar muy pronto');

  // Toca justo después de que la criatura pasó.
  const late = play({
    onFrame: (g) => {
      if (!g.shieldBusy() && g.creatures.some((c) => c.state === 'hit' && c.stateT > 0.05)) {
        g.activateShield();
      }
    },
  });
  assert.ok(late.events.some((e) => e.type === 'late'));
});

test('el escudo dura ~1 s, recarga, y guarda un toque hecho justo antes de estar listo', () => {
  const game = new Game({ rng: createRng(1) });
  assert.equal(game.activateShield(), 'inactive', 'antes de empezar no hace nada');
  game.start();
  game.update(DT);
  assert.equal(game.activateShield(), 'ok');
  assert.equal(game.activateShield(), 'busy');

  let open = 0;
  while (game.shield.active) {
    game.update(DT);
    open += DT;
  }
  assert.ok(Math.abs(open - SHIELD.duration) < 2 * DT, `abierto ${open.toFixed(3)} s`);
  assert.equal(game.activateShield(), 'busy', 'recién cerrado: demasiado pronto para guardarlo');
  while (game.shield.cooldown > 0.15) game.update(DT);
  assert.equal(game.activateShield(), 'buffered');
  let opened = null;
  for (let i = 0; i < 30 && !opened; i++) {
    opened = game.update(DT).find((e) => e.type === 'shield');
  }
  assert.ok(opened, 'se abrió solo al terminar la recarga');
  assert.equal(opened.buffered, true);
  assert.equal(game.shield.active, true);

  // Tocar en cada cuadro rinde menos que tocar a tiempo.
  const spam = play({ onFrame: (g) => g.activateShield() }).game;
  const sharp = play({ onFrame: sharpPlayer }).game;
  assert.ok(spam.misses > 0, 'tocar sin parar deja pasar criaturas');
  assert.ok(spam.score < sharp.score);
});

test('un fallo rompe la racha pero no termina la partida', () => {
  let skipped = false;
  const { game, events } = play({
    onFrame: (g) => {
      if (!skipped && g.streak === 4) {
        if (g.creatures.some((c) => c.state === 'hit')) skipped = true;
        return;
      }
      glowPlayer(g);
    },
  });
  const miss = events.find((e) => e.type === 'miss');
  assert.ok(miss, 'hubo un fallo');
  assert.equal(miss.streakLost, 4);
  const after = events.find((e) => e.type === 'block' && e.at > miss.at);
  assert.equal(after.streak, 1, 'la racha vuelve a empezar');
  assert.equal(after.bloom, 0);
  assert.equal(game.state, 'ended');
  assert.equal(game.time, GAME_DURATION);
});

test('reiniciar deja todo en cero y la nueva partida es completa', () => {
  const { game } = play({ onFrame: sharpPlayer });
  assert.ok(game.score > 0);
  game.start();
  assert.equal(game.state, 'playing');
  assert.equal(game.time, 0);
  assert.equal(game.score, 0);
  assert.equal(game.streak, 0);
  assert.equal(game.bestStreak, 0);
  assert.equal(game.blocks, 0);
  assert.equal(game.misses, 0);
  assert.deepEqual(game.byType, [0, 0, 0]);
  assert.equal(game.groupBonuses, 0);
  assert.equal(game.rush, false);
  assert.equal(game.buffered, false);
  assert.equal(game.creatures.length, 0);
  assert.equal(game.shield.active, false);

  const phases = [];
  while (game.state === 'playing') {
    sharpPlayer(game);
    for (const e of game.update(DT)) if (e.type === 'phase') phases.push(e.index);
  }
  assert.deepEqual(phases, [0, 1, 2]);
  assert.equal(game.time, GAME_DURATION);
  assert.ok(game.score > 0);
});

test('pausar (no llamar a update) congela tiempo y criaturas', () => {
  const game = new Game({ rng: createRng(5) });
  game.start();
  for (let i = 0; i < 300; i++) game.update(DT);
  const snapshot = JSON.stringify({ t: game.time, c: game.creatures.map((c) => c.dist) });
  assert.equal(JSON.stringify({ t: game.time, c: game.creatures.map((c) => c.dist) }), snapshot);
  game.update(DT);
  assert.ok(game.time > 300 * DT);
});

test('funciona igual con cuadros irregulares (30 fps y saltos)', () => {
  const { game } = play({ dt: 1 / 30, onFrame: glowPlayer });
  assert.equal(game.time, GAME_DURATION);
  assert.equal(game.misses, 0);
  const jumpy = play({ dt: 0.05, onFrame: glowPlayer }).game;
  assert.equal(jumpy.time, GAME_DURATION);
});

test('floración del escudo por racha', () => {
  assert.deepEqual([0, 2, 3, 5, 6, 9, 10, 30].map(bloomLevelFor), [0, 0, 1, 1, 2, 2, 3, 3]);
});
