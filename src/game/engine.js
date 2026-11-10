// Lógica pura de la partida: tiempo, etapas, criaturas, escudo y puntuación.
// No toca el DOM ni el canvas, así puede probarse en Node (ver tests/engine.test.mjs).

import {
  GAME_DURATION,
  PHASES,
  CREATURE_TYPES,
  INTRO_TIME,
  SHIELD,
  ZONE_TIME,
  PERFECT_TIME,
  INPUT_BUFFER,
  RUSH,
  SPAWN,
  STREAK_MILESTONE,
  phaseIndexAt,
  bloomLevelFor,
} from './config.js';

const BLOCKED_LIFE = 1.0; // segundos de animación de rebote antes de retirar la criatura
const HIT_LIFE = 1.5;
const EARLY_WINDOW = 0.7; // un fallo poco después de cerrarse el escudo fue un toque «muy pronto»
const LATE_WINDOW = 0.25; // tocar justo después de un fallo fue «un poco tarde»

export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, k) => a + (b - a) * k;

// Distancia (más allá del borde del escudo) según la fracción de viaje que falta (1 → 0).
// Cada criatura llega exactamente en `impactAt`, se mueva como se mueva: así el aro de
// aviso, que se basa en el tiempo, siempre dice la verdad.
export function reachAt(c, u) {
  if (c.motion === 'acelera') return c.reach * Math.pow(u, 0.65);
  if (c.motion === 'finta') {
    if (u > 0.55) return c.reach * (0.5 + (0.5 * (u - 0.55)) / 0.45);
    if (u > 0.25) return c.reach * 0.5; // se queda quieta, «cargando»
    return c.reach * 0.5 * (u / 0.25); // y se lanza al doble de velocidad
  }
  return c.reach * u;
}

export class Game {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.state = 'ready'; // 'ready' | 'playing' | 'ended'
    this.time = 0;
    this.phase = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.blocks = 0;
    this.perfects = 0;
    this.misses = 0;
    this.whiffs = 0;
    this.byType = CREATURE_TYPES.map(() => 0);
    this.groupBonuses = 0;
    this.spawned = 0;
    this.creatures = [];
    this.groups = new Map();
    // closeAt: momento en que se cierra (cada bloqueo lo alarga). blocked: bloqueos de esta apertura.
    this.shield = { active: false, age: 0, closeAt: 0, blocked: 0, cooldown: 0, cooldownMax: SHIELD.cooldown };
    this.buffered = false;
    this.lastShieldEnd = -Infinity;
    this.rush = false;
    this.nextImpactAt = SPAWN.firstImpact;
    this.nextId = 1;
    this.nextGroup = 1;
    this.side = this.rng() < 0.5 ? -1 : 1;
    this.pending = [];
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.pending.push({ type: 'phase', index: 0 });
  }

  get timeLeft() {
    return Math.max(0, GAME_DURATION - this.time);
  }

  get bloom() {
    return bloomLevelFor(this.streak);
  }

  // 1 = listo para usarse, 0 = abierto o recién cerrado.
  get shieldCharge() {
    if (this.shield.active) return 0;
    if (this.shield.cooldown > 0) return 1 - this.shield.cooldown / this.shield.cooldownMax;
    return 1;
  }

  shieldBusy() {
    return this.shield.active || this.shield.cooldown > 0;
  }

  timeToImpact(c) {
    return c.impactAt - this.time;
  }

  anyInZone() {
    return this.creatures.some((c) => c.state === 'approach' && c.inZone);
  }

  // Devuelve 'ok', 'buffered' (se abrirá al terminar la recarga), 'busy' o 'inactive'.
  activateShield() {
    if (this.state !== 'playing') return 'inactive';
    if (this.shieldBusy()) {
      if (!this.shield.active && this.shield.cooldown <= INPUT_BUFFER) {
        this.buffered = true;
        return 'buffered';
      }
      return 'busy';
    }
    this.openShield(this.pending, false);
    return 'ok';
  }

  openShield(events, buffered) {
    this.shield.active = true;
    this.shield.age = 0;
    this.shield.closeAt = this.time + SHIELD.duration;
    this.shield.blocked = 0;
    this.buffered = false;
    // Esperar a que el aro se cierre y tocar en el último momento es «¡Perfecto!».
    for (const c of this.creatures) {
      if (c.state === 'approach' && this.timeToImpact(c) <= PERFECT_TIME) c.perfect = true;
    }
    if (this.creatures.some((c) => c.state === 'hit' && c.stateT < LATE_WINDOW)) {
      events.push({ type: 'late' });
    }
    events.push({ type: 'shield', buffered });
  }

  update(dt) {
    const events = this.pending;
    this.pending = [];
    if (this.state !== 'playing') return events;

    const prevTime = this.time;
    this.time = Math.min(GAME_DURATION, this.time + dt);
    const step = this.time - prevTime;
    const t = this.time;

    const phase = phaseIndexAt(t);
    if (phase !== this.phase) {
      this.phase = phase;
      events.push({ type: 'phase', index: phase });
    }
    if (!this.rush && t >= RUSH.start) {
      this.rush = true;
      events.push({ type: 'rush' });
    }

    const prevLeft = Math.ceil(GAME_DURATION - prevTime);
    const left = Math.ceil(GAME_DURATION - t);
    if (left !== prevLeft && left >= 1 && left <= 5) {
      events.push({ type: 'tick', secondsLeft: left });
    }

    // Se programa por momento de llegada, no de aparición: así el espacio entre llegadas
    // se respeta también en los cambios de etapa, donde cambia la velocidad.
    while (this.nextImpactAt - PHASES[phase].travel <= t) this.spawnGroup(t, events);

    // Los impactos se resuelven antes de envejecer el escudo: en caso de empate gana el jugador.
    for (const c of this.creatures) {
      c.t += step;
      if (c.state !== 'approach') {
        c.stateT += step;
        continue;
      }
      const remaining = Math.max(0, c.impactAt - t);
      const u = remaining / c.travel;
      c.dist = SHIELD.hitRadius + reachAt(c, u);
      c.hover = c.motion === 'finta' && u > 0.25 && u <= 0.55;
      if (!c.inZone && remaining <= ZONE_TIME) {
        c.inZone = true;
        events.push({ type: 'zone', creature: c });
      }
      if (remaining <= 0) {
        c.dist = SHIELD.hitRadius;
        c.hover = false;
        this.resolveImpact(c, events);
      }
    }
    this.creatures = this.creatures.filter(
      (c) =>
        c.state === 'approach' ||
        (c.state === 'blocked' && c.stateT < BLOCKED_LIFE) ||
        (c.state === 'hit' && c.stateT < HIT_LIFE)
    );

    const sh = this.shield;
    if (sh.active) {
      sh.age += step;
      if (t >= sh.closeAt) {
        // Si se cerró sin bloquear nada (tocó «al aire»), tarda más en recargar.
        const whiff = sh.blocked === 0;
        sh.active = false;
        sh.cooldownMax = whiff ? SHIELD.whiffCooldown : SHIELD.cooldown;
        sh.cooldown = sh.cooldownMax;
        this.lastShieldEnd = t;
        if (whiff) this.whiffs += 1;
        events.push({ type: 'shieldEnd', whiff });
      }
    } else if (sh.cooldown > 0) {
      sh.cooldown = Math.max(0, sh.cooldown - step);
      if (sh.cooldown === 0 && this.buffered) this.openShield(events, true);
    }

    if (t >= GAME_DURATION) {
      this.state = 'ended';
      const leftovers = this.creatures;
      this.creatures = [];
      events.push({ type: 'end', leftovers, summary: this.summary() });
    }

    return events;
  }

  resolveImpact(c, events) {
    c.stateT = 0;
    if (this.shield.active) {
      c.state = 'blocked';
      // El escudo sigue abierto un poco más para el resto del grupo.
      this.shield.blocked += 1;
      this.shield.closeAt = Math.max(this.shield.closeAt, c.impactAt + SHIELD.extend);
      const prevBloom = bloomLevelFor(this.streak);
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.blocks += 1;
      this.byType[c.type] += 1;
      if (c.perfect) this.perfects += 1;
      const bloom = bloomLevelFor(this.streak);
      // Cada virus suma exactamente sus puntos (1, 2 o 3), sin multiplicadores.
      const points = CREATURE_TYPES[c.type].points;
      this.score += points;
      events.push({
        type: 'block',
        creature: c,
        kind: c.type,
        points,
        perfect: c.perfect,
        rush: this.rush,
        streak: this.streak,
        bloom,
        bloomUp: bloom > prevBloom,
        milestone: this.streak >= 2 * STREAK_MILESTONE && this.streak % STREAK_MILESTONE === 0,
      });
    } else {
      c.state = 'hit';
      const streakLost = this.streak;
      this.streak = 0;
      this.misses += 1;
      const reason = this.time - this.lastShieldEnd < EARLY_WINDOW ? 'early' : 'none';
      events.push({ type: 'miss', creature: c, streakLost, reason });
    }

    // Celebración si todo el grupo quedó bloqueado (no suma puntos extra).
    const g = this.groups.get(c.group);
    if (!g) return;
    g.resolved += 1;
    if (c.state === 'blocked') g.blocked += 1;
    if (g.resolved < g.size) return;
    this.groups.delete(c.group);
    if (g.size >= 2 && g.blocked === g.size) {
      this.groupBonuses += 1;
      events.push({ type: 'group', creature: c, size: g.size });
    }
  }

  spawnGroup(now, events) {
    const phaseIndex = phaseIndexAt(now);
    const ph = PHASES[phaseIndex];
    const firstImpact = this.nextImpactAt;
    const rng = this.rng;
    const intro = now < INTRO_TIME;
    const n = intro ? 1 : this.pickWeighted(ph.groups);
    const group = this.nextGroup++;

    // Alterna lados para que las criaturas lleguen desde direcciones distintas.
    this.side = -this.side;
    const base = -Math.PI / 2 + this.side * (0.12 + rng() * 0.6);
    const spacing = n > 1 ? Math.min(0.55, 1.3 / (n - 1)) : 0;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    let offset = 0;
    let count = 0;
    let hasFeint = false;
    for (let k = 0; k < n; k++) {
      if (k > 0) offset += lerp(ph.gap[0], ph.gap[1], rng());
      const impactAt = firstImpact + offset;
      if (impactAt > GAME_DURATION - SPAWN.endMargin) break;

      // Tipo de virus: como mucho uno «dorado» por grupo.
      let type = intro ? 0 : this.pickIndex(ph.types);
      if (type === 2 && hasFeint) type = 0;
      if (type === 2) hasFeint = true;
      const kind = CREATURE_TYPES[type];

      const slot = order[k] - (n - 1) / 2;
      let angle = n === 1 ? base : -Math.PI / 2 + slot * spacing + (rng() - 0.5) * 0.16;
      angle = Math.min(SPAWN.angleMax, Math.max(SPAWN.angleMin, angle));
      const speed = ph.speed * (0.94 + rng() * 0.12) * (type === 1 ? 1.12 : 1);
      const travel = impactAt - now;
      const zigzag = kind.motion === 'acelera';

      const creature = {
        id: this.nextId++,
        group,
        phase: phaseIndex,
        type,
        motion: kind.motion,
        angle,
        speed,
        travel,
        reach: speed * travel,
        dist: SHIELD.hitRadius + speed * travel,
        impactAt,
        wobA: zigzag ? 24 + rng() * 10 : 10 + rng() * 12,
        wobF: zigzag ? 4.5 + rng() * 1.5 : 2 + rng() * 1.5,
        wobP: rng() * Math.PI * 2,
        size: kind.size * (0.92 + rng() * 0.16),
        state: 'approach',
        t: 0,
        stateT: 0,
        hover: false,
        inZone: false,
        perfect: false,
      };
      this.creatures.push(creature);
      this.spawned += 1;
      count += 1;
      events.push({ type: 'spawn', creature });
    }
    if (count > 0) this.groups.set(group, { size: count, resolved: 0, blocked: 0 });

    this.nextImpactAt = firstImpact + offset + lerp(ph.interval[0], ph.interval[1], rng());
    if (this.nextImpactAt > GAME_DURATION) this.nextImpactAt = Infinity;
  }

  pickWeighted(options) {
    let r = this.rng();
    for (const [value, weight] of options) {
      if (r < weight) return value;
      r -= weight;
    }
    return options[options.length - 1][0];
  }

  pickIndex(weights) {
    let r = this.rng();
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) return i;
      r -= weights[i];
    }
    return 0;
  }

  summary() {
    return {
      score: this.score,
      blocks: this.blocks,
      perfects: this.perfects,
      misses: this.misses,
      whiffs: this.whiffs,
      bestStreak: this.bestStreak,
      byType: this.byType.slice(),
      groups: this.groupBonuses,
      spawned: this.spawned,
    };
  }
}
