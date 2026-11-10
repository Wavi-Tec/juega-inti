// Renderizador de la escena: fondo con parallax, clima, personajes, escudo, criaturas y efectos.
// Lee el estado del motor (engine.js) y nunca lo modifica.

import {
  SHIELD,
  ZONE_TIME,
  RING_TIME,
  PERFECT_TIME,
  CREATURE_TYPES,
  phaseIndexAt,
} from './config.js';
import {
  TAU,
  COLORS,
  CREATURE_PALETTES,
  GOLDEN_PALETTE,
  VELOZ_PALETTE,
  drawCrown,
  clamp,
  lerp,
  easeOutBack,
  easeOutCubic,
  hexToRgb,
  mixRgb,
  rgbStr,
  petalGradient,
  softShadow,
  drawEchi,
  drawPerson,
  drawCreature,
  drawPetal,
  drawSparkle,
  drawSpeechBubble,
  loadImage,
  makeSprite,
  drawBillboardFace,
  drawBillboard,
  drawBottleDisplay,
  BILLBOARD,
  BOTTLE_STAND,
  SPRITE_PAD,
} from './art.js';

export const WORLD_WIDTH = 540;
const W = WORLD_WIDTH;

// Paletas: sol (inicio y final), nublado, lluvia, nieve. Se mezclan según el clima.
const PALETTE_DEFS = [
  {
    skyTop: '#7CC8F2', skyBottom: '#E4F6F0', cloud: '#FFFFFF', cloudShade: '#DCEEF7',
    hillFar: '#A6D8A8', hillMid: '#78C27E', tree: '#4FAE66', treeDark: '#3A8E52',
    bush: '#5DB86C', ground: '#7CC86A', groundDark: '#5EAE55', path: '#F2DDB0',
    pathEdge: '#DCC08C', grass: '#4CA85A', grassDark: '#368A47',
  },
  {
    skyTop: '#9DB4C9', skyBottom: '#E2EAEE', cloud: '#F4F7FA', cloudShade: '#C9D4DE',
    hillFar: '#A2BFA6', hillMid: '#80AC88', tree: '#5B9B6C', treeDark: '#457E56',
    bush: '#68A776', ground: '#80B470', groundDark: '#679B5D', path: '#E7D6B3',
    pathEdge: '#CDB991', grass: '#55985F', grassDark: '#3F7C4B',
  },
  {
    skyTop: '#6B809B', skyBottom: '#AFC0CF', cloud: '#A3B1C0', cloudShade: '#7D8C9E',
    hillFar: '#7C9A95', hillMid: '#5F8A78', tree: '#467E62', treeDark: '#35664F',
    bush: '#4F8A69', ground: '#5F9568', groundDark: '#4C7D56', path: '#B9AE98',
    pathEdge: '#9C917C', grass: '#3E7B53', grassDark: '#2F6443',
  },
  {
    skyTop: '#AFC6E0', skyBottom: '#F1F5FA', cloud: '#FFFFFF', cloudShade: '#DCE5F0',
    hillFar: '#E3EBF4', hillMid: '#D2DEEB', tree: '#7FA79A', treeDark: '#5F8A7E',
    bush: '#9DBDB3', ground: '#EEF3F8', groundDark: '#D6E0EA', path: '#DCE4EE',
    pathEdge: '#C4D0DD', grass: '#B5CFC8', grassDark: '#93B3AB',
  },
];
const PALETTE_KEYS = Object.keys(PALETTE_DEFS[0]);
const PALETTES_RGB = Object.fromEntries(
  PALETTE_KEYS.map((k) => [k, PALETTE_DEFS.map((p) => hexToRgb(p[k]))])
);

// Común: color de la etapa. Veloz: naranja. Dorado: dorado con corona.
function paletteFor(c) {
  if (c.type === 2) return GOLDEN_PALETTE;
  if (c.type === 1) return VELOZ_PALETTE;
  return CREATURE_PALETTES[c.phase];
}

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Carteles de la marca y frasco gigante junto al camino: se alternan cada PROP_SPACING, delante
// del jardín y a su misma velocidad, para que ningún arbusto tape la marca.
const PROP_SPACING = 520;
const PROP_PARALLAX = 0.75;
const PROP_MARGIN = 150;
// Alto del frasco que lleva la persona en la mano.
const HAND_BOTTLE = 72;

// Personajes 3D (models3d.js): alto en unidades lógicas y hacia dónde miran (giro en radianes;
// positivo = hacia la derecha, hacia donde caminan).
const PERSON_3D_H = 190;
const ECHI_3D_H = 160;
const PERSON_TURN = 0.7;
const ECHI_TURN = 0.3;
// Echi algo más bajo que la persona; con la racha crece apenas (como mucho un 4,5 %).
const ECHI_SIZE = 0.85;
const ECHI_GROWTH = 0.015;

// Resolución interna del lienzo: como mucho 2 píxeles por píxel CSS (más no se nota en un celular y
// cuesta muchísimo) y unos 3 MP en pantallas grandes.
const MAX_DPR = 2;
const PIXEL_BUDGET = 3e6;

const MAX_PARTICLES = 420;
// Cantidades para una columna (W); en pantallas anchas se usan más, hasta estos máximos.
const BASE_CLOUDS = 7;
const BASE_RAIN = 170;
const BASE_SNOW = 150;
const MAX_CLOUDS = 24;
const MAX_RAIN = 560;
const MAX_SNOW = 500;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export class Scene {
  /**
   * brand: imágenes para los carteles del camino, o null para no mostrarlos.
   *   { product: URL de la foto del producto, logo: URL del logo del distribuidor,
   *     bottleCrop: { x, y, w, h } recorte del frasco dentro de la foto, o null }
   */
  constructor(canvas, { font = 'sans-serif', reducedMotion = false, brand = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.font = font;
    this.reducedMotion = reducedMotion;
    this.brand = brand;
    this.sprites = null;
    this.hurtVignette = null;
    // Los textos de los carteles se vuelven a dibujar cuando termina de cargar la fuente.
    this.fontsReady = false;
    globalThis.document?.fonts?.ready.then(() => {
      this.fontsReady = true;
    });
    this.W = W;
    this.H = 960;
    this.dpr = 1;
    this.quality = 1;
    this.cssScale = 1;

    this.t = 0;
    this.walkX = 0;
    this.walkPhase = 0;
    this.walking = 1;
    this.weights = [1, 0, 0, 0];
    this.P = {};
    this.Prgb = {};
    this.mixPalette();

    // Extensión visible del mundo en unidades lógicas. La columna de juego va de 0 a W;
    // en pantallas anchas el mundo (cielo, jardín, clima) sigue a ambos lados.
    this.left = 0;
    this.right = W;
    this.originX = 0;
    this.originY = 0;

    this.clouds = Array.from({ length: MAX_CLOUDS }, (_, i) => ({
      x: hash(i) * 640 - 50,
      y: 70 + hash(i + 10) * 330,
      s: 0.7 + hash(i + 20) * 0.7,
      v: 6 + hash(i + 30) * 10,
    }));
    this.rain = Array.from({ length: MAX_RAIN }, () => this.newDrop(true));
    this.snow = Array.from({ length: MAX_SNOW }, () => this.newFlake(true));

    this.reset();
    this.resize(W, 960, 1);
  }

  // Cuánto más ancho que la columna es lo visible (1 en un celular vertical).
  get span() {
    return (this.right - this.left) / W;
  }

  reset() {
    this.particles = [];
    this.texts = [];
    this.ripples = [];
    this.shake = 0;
    this.flash = { color: '255,255,255', a: 0 };
    this.shieldOpen = 0;
    this.shieldRot = 0;
    this.bloomVis = 0;
    this.finaleT = 0;
    this.zoom = 0;
    this.rushT = -1;
    this.lastMissText = -9;
    this.lastWhiffText = -9;
    this.hurt = 0;
    this.combo = { value: 0, shown: 0, pop: 0 };
    this.echi = { expr: null, exprT: 0, tapAge: 9, blinkT: 2.2, blink: 0, look: 0, wave: 0, turn: ECHI_TURN };
    this.person = { expr: null, exprT: 0, blinkT: 3.4, blink: 0, turn: PERSON_TURN, wave: 0 };
  }

  /**
   * cssW × cssH: tamaño del lienzo en px CSS (toda la ventana).
   * column: rectángulo de la columna de juego relativo al lienzo, en px CSS. Por defecto, el lienzo entero.
   */
  resize(cssW, cssH, dpr = 1, column = { left: 0, top: 0, width: cssW, height: cssH }) {
    // `quality` baja la resolución si el equipo no logra mantener la fluidez (ver EchiGame), hasta
    // `minQuality`: 1 píxel de lienzo por píxel CSS.
    const base = Math.min(dpr || 1, MAX_DPR, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssW * cssH)));
    this.minQuality = clamp(1 / base, 0.5, 0.75);
    this.dpr = Math.max(0.5, base * this.quality);
    this.cssScale = column.width / W;
    this.originX = column.left;
    this.originY = column.top;
    this.H = Math.max(900, column.height / this.cssScale);
    this.left = -column.left / this.cssScale;
    this.right = (cssW - column.left) / this.cssScale;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    const extra = Math.max(0, this.H - 960);
    this.groundY = this.H - 200 - extra * 0.45;
    this.personPos = { x: 212, y: this.groundY };
    this.echiPos = { x: 350, y: this.groundY + 2 };
    this.center = { x: 282, y: this.groundY - 108 };
    this.vignette = null;
    // Nubes, lluvia y nieve repartidas por todo el ancho visible.
    const span = this.right - this.left;
    this.clouds.forEach((c, i) => {
      c.x = this.left - 60 + hash(i) * (span + 120);
    });
    for (const d of this.rain) d.x = this.left + Math.random() * (span + 160);
    for (const f of this.snow) f.x = this.left + Math.random() * (span + 40);
  }

  toLogical(clientX, clientY, rect) {
    return {
      x: (clientX - rect.left - this.originX) / this.cssScale,
      y: (clientY - rect.top - this.originY) / this.cssScale,
    };
  }

  echiScale() {
    return ECHI_SIZE * (1 + ECHI_GROWTH * this.bloomVis);
  }

  echiHead() {
    return { x: this.echiPos.x, y: this.echiPos.y - (98 + this.echiHop()) * this.echiScale() };
  }

  echiHop() {
    return Math.abs(Math.sin(this.walkPhase)) * 9 * this.walking;
  }

  hitsEchi(x, y) {
    const head = this.echiHead();
    if (Math.hypot(x - head.x, y - head.y) < 84) return true;
    return Math.abs(x - this.echiPos.x) < 42 && y > head.y && y < this.echiPos.y + 12;
  }

  // ── Eventos del motor ────────────────────────────────────────────────────

  handle(events) {
    for (const e of events) {
      if (e.type === 'shield') this.onShield();
      else if (e.type === 'shieldEnd' && e.whiff) this.onWhiff();
      else if (e.type === 'block') this.onBlock(e);
      else if (e.type === 'miss') this.onMiss(e);
      else if (e.type === 'group') this.onGroup(e);
      else if (e.type === 'rush') this.onRush();
      else if (e.type === 'late') {
        const head = this.echiHead();
        this.addText('¡Un poco tarde!', head.x, head.y - 80, '#FFFFFF', 24, '#6A1B47');
        this.lastMissText = this.t;
      } else if (e.type === 'spawn') {
        const p = this.creaturePos(e.creature);
        const gold = e.creature.type === 2;
        this.puff(p.x, p.y, gold ? 7 : 4, gold ? '255,226,120' : '255,255,255');
      } else if (e.type === 'phase' && e.index > 0) {
        this.flash = { color: '255,255,255', a: 0.3 };
        this.leafGust();
      } else if (e.type === 'end') this.onEnd(e);
    }
  }

  setEchi(expr, dur) {
    this.echi.expr = expr;
    this.echi.exprT = dur;
  }

  setPerson(expr, dur) {
    this.person.expr = expr;
    this.person.exprT = dur;
  }

  onShield() {
    this.echi.tapAge = 0;
    this.setEchi('cast', 0.55);
    const head = this.echiHead();
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU;
      const sp = 120 + Math.random() * 160;
      this.addParticle({
        type: 'petal', x: head.x, y: head.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        rot: a, vr: (Math.random() - 0.5) * 10, size: 10 + Math.random() * 6,
        color: Math.random() < 0.6 ? COLORS.pink : COLORS.pinkLight, life: 0.6, max: 0.6, g: 200,
      });
    }
    this.addParticle({ type: 'ring', x: head.x, y: head.y, r0: 20, r1: 90, life: 0.35, max: 0.35, color: '255,214,230', width: 6 });
  }

  // El escudo se cerró sin bloquear nada: se marchita y Echi tarda más en recargar.
  onWhiff() {
    const C = this.center;
    const R = SHIELD.radius;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + Math.random() * 0.3;
      this.addParticle({
        type: 'petal', x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R,
        vx: Math.cos(a) * 30, vy: 20 + Math.random() * 40, rot: a + Math.PI / 2, vr: (Math.random() - 0.5) * 4,
        size: 13, color: i % 2 ? '#D9B3C4' : '#BE8FA5', life: 0.9, max: 0.9, g: 380,
      });
    }
    // Un consejo por error: si acaba de fallar o tocó tarde, ya se le dijo qué pasó.
    if (this.t - this.lastWhiffText > 1.2 && this.t - this.lastMissText > 1.2) {
      this.lastWhiffText = this.t;
      const head = this.echiHead();
      this.addText('¡Espera el brillo!', head.x, head.y - 80, '#FFFFFF', 24, '#6A1B47', 1);
    }
    this.setEchi('worried', 0.5);
  }

  // Superó su récord en plena partida.
  onRecord() {
    this.addText('¡Nuevo récord!', W / 2, this.center.y - SHIELD.radius - 200, COLORS.gold, 40, COLORS.pinkDark, 1.8);
    this.flash = { color: '255,226,120', a: 0.3 };
    this.zoom = Math.max(this.zoom, 0.9);
    this.petalShower(36);
    this.setEchi('cheer', 0.9);
    this.setPerson('happy', 0.9);
  }

  onBlock(e) {
    const c = e.creature;
    const p = this.creaturePos(c);
    this.ripples.push({ angle: c.angle, age: 0 });
    const n = 8 + e.bloom * 4;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = 140 + Math.random() * 220;
      this.addParticle({
        type: 'petal', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        rot: a, vr: (Math.random() - 0.5) * 12, size: 9 + Math.random() * 8,
        color: [COLORS.pink, COLORS.pinkLight, '#FFFFFF'][i % 3], life: 0.9, max: 0.9, g: 320,
      });
    }
    const golden = e.kind === 2;
    const shiny = e.perfect || golden;
    for (let i = 0; i < (golden ? 18 : 7); i++) {
      const a = Math.random() * TAU;
      const sp = 90 + Math.random() * (golden ? 260 : 160);
      this.addParticle({
        type: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: Math.random() * TAU, vr: 6, size: 7 + Math.random() * 6,
        color: shiny ? COLORS.gold : '#FFFFFF', life: 0.55, max: 0.55, g: 0,
      });
    }
    this.addParticle({ type: 'ring', x: p.x, y: p.y, r0: 14, r1: golden ? 110 : 70, life: 0.4, max: 0.4, color: shiny ? '255,210,63' : '255,255,255', width: 7 });
    if (shiny) {
      this.addParticle({
        type: 'rays', x: p.x, y: p.y, r0: 22, r1: golden ? 135 : 105, n: golden ? 16 : 12,
        rot: Math.random() * TAU, color: '255,210,63', width: 6, life: 0.34, max: 0.34,
      });
    }

    const label = e.perfect ? `¡Perfecto! +${e.points}` : `+${e.points}`;
    this.addText(label, p.x, p.y - 34, shiny ? COLORS.gold : '#FFFFFF', golden ? 34 : 30);
    if (golden) {
      this.flash = { color: '255,226,120', a: 0.25 };
      this.zoom = Math.max(this.zoom, 0.7);
    }

    if (e.bloomUp) {
      const msg = e.bloom === 1 ? '¡Racha! El escudo florece' : e.bloom === 2 ? '¡Súper racha!' : '¡Escudo en flor total!';
      this.addText(msg, W / 2, this.center.y - SHIELD.radius - 150, '#FFFFFF', 34, COLORS.pinkDark, 1.6);
      this.flash = { color: '255,170,205', a: 0.2 };
      this.zoom = Math.max(this.zoom, 0.6);
      this.petalShower(28);
    }
    if (e.milestone) {
      this.addText(`¡Racha de ${e.streak}!`, W / 2, this.center.y - SHIELD.radius - 150, COLORS.gold, 38, COLORS.pinkDark, 1.6);
      this.flash = { color: '255,226,120', a: 0.25 };
      this.zoom = Math.max(this.zoom, 0.8);
      this.petalShower(24);
    }
    this.shake = Math.max(this.shake, 4);
    this.setEchi('happy', 0.6);
    this.setPerson('happy', 0.7);
  }

  onMiss(e) {
    const head = { x: this.personPos.x + 6, y: this.personPos.y - 160 };
    // Dice qué pasó para que el siguiente intento salga mejor (una sola vez por grupo).
    if (this.t - this.lastMissText > 0.8) {
      this.lastMissText = this.t;
      const msg = e.reason === 'early' ? '¡Muy pronto!' : '¡Toca cuando brille!';
      this.addText(msg, head.x + 10, head.y - 62, '#FFE3EE', e.reason === 'early' ? 32 : 26, '#6A1B47', 1.3);
    }
    if (e.streakLost >= 3) this.addText(`Racha de ${e.streakLost} perdida`, head.x + 20, head.y - 24, '#FFFFFF', 22, '#6A1B47');
    this.setPerson('oops', 0.85);
    this.setEchi('worried', 0.8);
    this.shake = Math.max(this.shake, 7);
    this.flash = { color: '120,60,160', a: 0.2 };
    this.hurt = 1;
    const p = this.creaturePos(e.creature);
    this.puff(p.x, p.y, 3, '230,210,255');
  }

  onGroup(e) {
    const C = this.center;
    const R = SHIELD.radius;
    this.addText('¡Grupo completo!', W / 2, C.y - R - 110, COLORS.gold, 34, COLORS.pinkDark, 1.5);
    this.addParticle({ type: 'ring', x: C.x, y: C.y, r0: R, r1: R + 90, life: 0.55, max: 0.55, color: '255,210,63', width: 12 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      this.addParticle({
        type: 'petal', x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R,
        vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 40, rot: a + Math.PI / 2, vr: 5,
        size: 14, color: i % 2 ? COLORS.pink : COLORS.gold, life: 0.9, max: 0.9, g: 200,
      });
    }
    this.flash = { color: '255,255,255', a: 0.28 };
    this.zoom = 1;
    this.shake = Math.max(this.shake, 6);
    this.setEchi('cheer', 0.8);
    this.setPerson('happy', 0.9);
  }

  onRush() {
    this.rushT = 0;
    this.addText('¡Ráfaga final!', W / 2, this.center.y - SHIELD.radius - 170, COLORS.gold, 44, COLORS.pinkDark, 1.8);
    this.addText('¡Últimos 10 segundos!', W / 2, this.center.y - SHIELD.radius - 120, '#FFFFFF', 28, COLORS.pinkDark, 1.8);
    this.flash = { color: '255,226,120', a: 0.3 };
    this.zoom = 0.8;
  }

  breakCombo() {
    const x = 66;
    const y = this.groundY - 178;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      this.addParticle({
        type: 'petal', x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40,
        vx: Math.cos(a) * 90, vy: Math.sin(a) * 60 - 40, rot: a + Math.PI / 2, vr: 6,
        size: 13, color: i % 2 ? COLORS.pink : COLORS.pinkLight, life: 1.1, max: 1.1, g: 420,
      });
    }
  }

  onEnd(e) {
    for (const c of e.leftovers) {
      const p = this.creaturePos(c);
      this.puff(p.x, p.y, 6, '255,255,255');
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * TAU;
        this.addParticle({
          type: 'petal', x: p.x, y: p.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 60,
          rot: a, vr: 8, size: 11, color: COLORS.pinkLight, life: 1, max: 1, g: 200,
        });
      }
    }
    this.finaleT = 1.8;
    this.setPerson('cheer', 99);
    this.setEchi('cheer', 99);
    this.petalShower(60);
    this.addText('¡Lo lograste!', W / 2, this.center.y - SHIELD.radius - 90, '#FFFFFF', 46, COLORS.pinkDark, 1.8);
  }

  petalShower(base) {
    const n = Math.round(base * Math.min(this.span, 2.5));
    for (let i = 0; i < n; i++) {
      this.addParticle({
        type: 'petal', x: this.left + Math.random() * (this.right - this.left), y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 120,
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, size: 10 + Math.random() * 8,
        color: [COLORS.pink, COLORS.pinkLight, COLORS.pinkPale][i % 3], life: 3, max: 3, g: 30,
      });
    }
  }

  leafGust() {
    for (let i = 0; i < 14; i++) {
      this.addParticle({
        type: 'petal', x: this.right + 20 + Math.random() * 80, y: 200 + Math.random() * (this.groundY - 260),
        vx: -260 - Math.random() * 160, vy: (Math.random() - 0.5) * 60,
        rot: Math.random() * TAU, vr: 7, size: 12, color: i % 2 ? COLORS.greenLight : COLORS.pinkLight,
        life: 2.4 * Math.max(1, this.span * 0.8), max: 2.4 * Math.max(1, this.span * 0.8), g: 20,
      });
    }
  }

  puff(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.addParticle({
        type: 'puff', x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
        r: 12 + Math.random() * 12, color, life: 0.5, max: 0.5, g: 0,
      });
    }
  }

  addParticle(p) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  }

  addText(text, x, y, color, size, stroke = 'rgba(60, 20, 50, 0.85)', life = 1.1) {
    const cx = clamp(x, 120, W - 120);
    // Si coincide con otro texto (bloqueos simultáneos), se apila encima.
    let cy = y;
    for (let pass = 0; pass < 6; pass++) {
      const hit = this.texts.find(
        (o) => Math.abs(o.x - cx) < 170 && Math.abs(o.y - cy) < (o.size + size) * 0.55
      );
      if (!hit) break;
      cy = hit.y - (hit.size + size) * 0.62;
    }
    this.texts.push({ text, x: cx, y: cy, color, size, stroke, life, max: life });
  }

  // ── Actualización ────────────────────────────────────────────────────────

  targetWeights(mode, game) {
    if (mode === 'inicio' || mode === 'final' || mode === 'resultado') return [1, 0, 0, 0];
    if (mode === 'cuenta') return [0, 1, 0, 0];
    const w = [0, 0, 0, 0];
    w[phaseIndexAt(game.time) + 1] = 1;
    return w;
  }

  mixPalette() {
    for (const k of PALETTE_KEYS) {
      this.Prgb[k] = mixRgb(PALETTES_RGB[k], this.weights);
      this.P[k] = rgbStr(this.Prgb[k]);
    }
  }

  newDrop(initial) {
    return {
      x: this.left + Math.random() * (this.right - this.left + 160),
      y: initial ? Math.random() * 1000 : -30 - Math.random() * 120,
      len: 18 + Math.random() * 12,
      v: 850 + Math.random() * 250,
    };
  }

  newFlake(initial) {
    return {
      x: this.left + Math.random() * (this.right - this.left + 40),
      y: initial ? Math.random() * 1000 : -10 - Math.random() * 60,
      r: 1.8 + Math.random() * 3,
      v: 45 + Math.random() * 70,
      p: Math.random() * TAU,
    };
  }

  // Lluvia y nieve con la misma densidad en cualquier ancho de pantalla.
  weatherCount(list, base, weight) {
    return Math.min(list.length, Math.round(base * this.span * weight));
  }

  update(dt, game, mode) {
    this.t += dt;

    const standing = mode === 'final' || mode === 'resultado';
    this.walking += ((standing ? 0 : 1) - this.walking) * Math.min(1, dt * 3);
    this.walkX += 70 * this.walking * dt;
    this.walkPhase += dt * 7.2 * this.walking;

    const target = this.targetWeights(mode, game);
    const k = 1 - Math.exp(-dt / 0.9);
    for (let i = 0; i < 4; i++) this.weights[i] += (target[i] - this.weights[i]) * k;
    this.mixPalette();

    for (const c of this.clouds) {
      c.x -= (c.v + 8 * this.walking) * dt;
      if (c.x < this.left - 170) {
        c.x = this.right + 170;
        c.y = 70 + Math.random() * 330;
      }
    }

    const rainCount = this.weatherCount(this.rain, BASE_RAIN, this.weights[2]);
    for (let i = 0; i < rainCount; i++) {
      const d = this.rain[i];
      d.y += d.v * dt;
      d.x -= d.v * 0.22 * dt;
      if (d.y > this.groundY + 30 + (i % 7) * 12) {
        if (i % 4 === 0 && d.x > this.left && d.x < this.right) {
          this.addParticle({ type: 'splash', x: d.x, y: d.y, life: 0.25, max: 0.25, vx: 0, vy: 0, g: 0 });
        }
        Object.assign(d, this.newDrop(false));
      }
    }
    const snowCount = this.weatherCount(this.snow, BASE_SNOW, this.weights[3]);
    for (let i = 0; i < snowCount; i++) {
      const f = this.snow[i];
      f.y += f.v * dt;
      f.x += (Math.sin(this.t * 1.4 + f.p) * 22 - 12) * dt;
      if (f.y > this.H + 10 || f.x < this.left - 20) Object.assign(f, this.newFlake(false));
    }

    // Escudo
    if (this.finaleT > 0) this.finaleT -= dt;
    const open = (game.state === 'playing' && game.shield.active) || this.finaleT > 0;
    this.shieldOpen = open
      ? Math.min(1, this.shieldOpen + dt / 0.14)
      : Math.max(0, this.shieldOpen - dt / 0.22);
    this.shieldRot += dt * (0.7 + this.bloomVis * 0.3);
    const bloomTarget = this.finaleT > 0 ? 3 : game.state === 'playing' ? game.bloom : 0;
    this.bloomVis += (bloomTarget - this.bloomVis) * Math.min(1, dt * 4);
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < 0.45);

    // Flor de racha: aparece desde 2 seguidos y se deshoja al perderla.
    const cb = this.combo;
    if (mode === 'partida') {
      const streak = game.streak;
      if (streak > cb.value) cb.pop = 1;
      else if (streak < cb.value && cb.value >= 2) this.breakCombo();
      cb.value = streak;
    }
    const showCombo = (mode === 'partida' || mode === 'pausa') && cb.value >= 2;
    cb.shown += ((showCombo ? 1 : 0) - cb.shown) * Math.min(1, dt * 10);
    cb.pop = Math.max(0, cb.pop - dt * 4);
    this.zoom = Math.max(0, this.zoom - dt * 4);

    // Ráfaga final: chispas doradas que suben desde el suelo.
    if (this.rushT >= 0 && mode === 'partida') {
      this.rushT += dt;
      if (Math.random() < dt * 14 * Math.min(this.span, 2.5)) {
        this.addParticle({
          type: 'spark', x: this.left + Math.random() * (this.right - this.left), y: this.H - 40,
          vx: (Math.random() - 0.5) * 30, vy: -160 - Math.random() * 120,
          rot: Math.random() * TAU, vr: 4, size: 5 + Math.random() * 5,
          color: COLORS.gold, life: 1.6, max: 1.6, g: 0,
        });
      }
    }

    // Personajes
    const e = this.echi;
    e.tapAge += dt;
    if (e.exprT > 0) {
      e.exprT -= dt;
      if (e.exprT <= 0) e.expr = null;
    }
    e.blinkT -= dt;
    if (e.blinkT <= 0) {
      e.blink = 0.12;
      e.blinkT = 2 + Math.random() * 2.5;
    }
    e.blink = Math.max(0, e.blink - dt);
    let lookTarget = 0;
    let nearest = Infinity;
    for (const c of game.creatures) {
      if (c.state !== 'approach' || c.dist >= nearest) continue;
      nearest = c.dist;
      lookTarget = clamp((this.creaturePos(c).x - this.echiPos.x) / 120, -1, 1);
    }
    e.look += (lookTarget - e.look) * Math.min(1, dt * 8);
    const waving = mode === 'inicio' && Math.sin(this.t * 0.9) > 0.55;
    e.wave += ((waving || mode === 'resultado' ? 1 : 0) - e.wave) * Math.min(1, dt * 5);
    // Echi 3D se gira hacia la criatura más cercana.
    e.turn += (ECHI_TURN + e.look * 0.45 - e.turn) * Math.min(1, dt * 6);

    const pr = this.person;
    if (pr.exprT > 0) {
      pr.exprT -= dt;
      if (pr.exprT <= 0) pr.expr = null;
    }
    pr.blinkT -= dt;
    if (pr.blinkT <= 0) {
      pr.blink = 0.12;
      pr.blinkT = 2.5 + Math.random() * 3;
    }
    pr.blink = Math.max(0, pr.blink - dt);
    // La persona 3D mira hacia donde camina; al saludar o celebrar se gira hacia la cámara.
    const prWaving = mode === 'inicio' && Math.sin(this.t * 0.9 + 2) > 0.7;
    const prTurn = prWaving ? 0.15 : pr.expr === 'cheer' || mode === 'resultado' ? 0.3 : PERSON_TURN;
    pr.turn += (prTurn - pr.turn) * Math.min(1, dt * 6);
    pr.wave += ((prWaving ? 1 : 0) - pr.wave) * Math.min(1, dt * 6);

    // Partículas
    for (const p of this.particles) {
      p.life -= dt;
      if (p.type === 'ring' || p.type === 'rays') continue; // crecen en su lugar, no se mueven
      p.vy += (p.g || 0) * dt;
      p.vx *= 1 - dt * 1.2;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const tx of this.texts) {
      tx.life -= dt;
      tx.y -= 38 * dt;
    }
    this.texts = this.texts.filter((tx) => tx.life > 0);

    this.shake *= Math.exp(-dt * 12);
    this.flash.a = Math.max(0, this.flash.a - dt * 1.6);
    this.hurt = Math.max(0, this.hurt - dt * 2.2);
  }

  creaturePos(c) {
    const C = this.center;
    const st = c.stateT;
    let d;
    let a = c.angle;
    let wob = 0;
    let rot = 0;
    let alpha = 1;
    let scale = c.size;
    if (c.state === 'approach') {
      d = c.dist;
      // El zigzag se apaga al acercarse (el del veloz, más tarde) para que el impacto sea claro.
      const fade = clamp((d - SHIELD.hitRadius) / (c.type === 1 ? 70 : 140), 0, 1);
      wob = c.wobA * Math.sin(c.wobF * c.t + c.wobP) * fade;
      rot = Math.sin(c.t * 2.5 + c.wobP) * 0.18;
      scale *= easeOutBack(clamp(c.t / 0.35, 0, 1));
    } else if (c.state === 'blocked') {
      // Rebota hacia afuera girando y se desvanece.
      d = SHIELD.hitRadius + 520 * st - 150 * st * st;
      a = c.angle + (c.angle < -Math.PI / 2 ? -1 : 1) * 0.5 * st;
      rot = st * 10;
      alpha = st < 0.6 ? 1 : clamp(1 - (st - 0.6) / 0.4, 0, 1);
      scale *= 1 + 0.3 * Math.exp(-st * 12) * Math.cos(st * 40);
    } else {
      // Fallo: choca con la persona, hace una mueca y se va flotando.
      if (st < 0.22) d = lerp(SHIELD.hitRadius, 72, easeOutCubic(st / 0.22));
      else if (st < 0.75) {
        d = 72;
        wob = Math.sin(st * 30) * 3;
      } else {
        const k = st - 0.75;
        d = 72 + k * 230;
        a = lerp(c.angle, -Math.PI / 2, clamp(k * 1.5, 0, 1));
        rot = Math.sin(st * 8) * 0.3;
      }
      alpha = st < 1.1 ? 1 : clamp(1 - (st - 1.1) / 0.4, 0, 1);
    }
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return { x: C.x + ca * d - sa * wob, y: C.y + sa * d + ca * wob, rot, alpha, scale };
  }

  // ── Dibujo ───────────────────────────────────────────────────────────────

  render(game, mode, { hint = false } = {}) {
    const ctx = this.ctx;
    const s = this.dpr * this.cssScale;
    // El origen lógico (0, 0) es la esquina de la columna de juego dentro del lienzo.
    ctx.setTransform(s, 0, 0, s, this.originX * this.dpr, this.originY * this.dpr);
    const vx = this.left;
    const vw = this.right - this.left;

    let sx = 0;
    let sy = 0;
    if (this.shake > 0.2 && !this.reducedMotion) {
      sx = (Math.random() - 0.5) * this.shake * 2;
      sy = (Math.random() - 0.5) * this.shake * 2;
    }
    ctx.save();
    ctx.translate(sx, sy);
    if (this.zoom > 0.01 && !this.reducedMotion) {
      // Golpe de cámara hacia el escudo en los grandes momentos.
      const z = 1 + 0.045 * easeOutCubic(this.zoom);
      ctx.translate(this.center.x, this.center.y);
      ctx.scale(z, z);
      ctx.translate(-this.center.x, -this.center.y);
    }

    this.drawBackground(ctx);
    this.drawShieldBack(ctx, game, mode);
    this.drawCharacters(ctx, game, mode);
    this.drawShieldFront(ctx);
    this.drawCreatures(ctx, game);
    this.drawParticles(ctx);
    this.drawForeground(ctx);
    this.drawWeather(ctx);
    this.drawCombo(ctx);
    if (mode === 'partida') this.drawEdgeArrows(ctx, game);
    this.drawTexts(ctx);
    if (hint) this.drawHint(ctx, game);

    ctx.restore();

    if (this.rushT >= 0 && (mode === 'partida' || mode === 'pausa')) {
      const a = Math.min(1, this.rushT * 2) * (0.45 + 0.25 * Math.sin(this.t * 9));
      ctx.strokeStyle = `rgba(255, 210, 63, ${a})`;
      ctx.lineWidth = 14;
      ctx.strokeRect(vx, 0, vw, this.H);
    }

    if (this.flash.a > 0.01) {
      ctx.fillStyle = `rgba(${this.flash.color},${this.flash.a * (this.reducedMotion ? 0.4 : 1)})`;
      ctx.fillRect(vx, 0, vw, this.H);
    }
    if (!this.vignette) {
      const cx = vx + vw / 2;
      const outer = Math.max(this.H * 0.78, vw * 0.62);
      const v = ctx.createRadialGradient(cx, this.H * 0.45, outer * 0.4, cx, this.H * 0.45, outer);
      v.addColorStop(0, 'rgba(20, 30, 50, 0)');
      v.addColorStop(1, 'rgba(20, 30, 50, 0.28)');
      this.vignette = v;
    }
    if (this.hurt > 0.01) {
      // Borde morado que late cuando un virus llega a la persona: una elipse ajustada a lo visible,
      // para que se vea también a los costados en un celular vertical.
      if (!this.hurtVignette) {
        const h = ctx.createRadialGradient(0, 0, 0.6, 0, 0, 1.12);
        h.addColorStop(0, 'rgba(130, 30, 120, 0)');
        h.addColorStop(1, 'rgba(130, 30, 120, 0.45)');
        this.hurtVignette = h;
      }
      ctx.save();
      ctx.translate(vx + vw / 2, this.H / 2);
      ctx.scale(vw / 2, this.H / 2);
      ctx.globalAlpha = this.hurt;
      ctx.fillStyle = this.hurtVignette;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 0.5 + this.weights[2] * 0.6;
    ctx.fillStyle = this.vignette;
    ctx.fillRect(vx, 0, vw, this.H);
    ctx.globalAlpha = 1;
  }

  // Índices de elementos repetidos cada `spacing` (con desplazamiento `off`) que caen en lo visible.
  visibleRange(spacing, off, margin) {
    return [Math.floor((this.left - margin + off) / spacing) - 1, Math.ceil((this.right + margin + off) / spacing) + 1];
  }

  drawBackground(ctx) {
    const P = this.P;
    const gy = this.groundY;
    const [wSun, wCloud, wRain, wSnow] = this.weights;
    const fx = this.left - 30; // franja horizontal que cubre todo lo visible (con margen por el temblor)
    const fw = this.right - this.left + 60;

    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, P.skyTop);
    sky.addColorStop(1, P.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(fx, -30, fw, gy + 60);

    const sunA = wSun + wCloud * 0.1 + wSnow * 0.3;
    if (sunA > 0.02) {
      const sx = W * 0.8;
      const sy = this.H * 0.15;
      ctx.save();
      ctx.globalAlpha = sunA;
      const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 140);
      g.addColorStop(0, 'rgba(255, 244, 190, 0.9)');
      g.addColorStop(1, 'rgba(255, 244, 190, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 140, sy - 140, 280, 280);
      ctx.translate(sx, sy);
      ctx.rotate(this.t * 0.1);
      ctx.fillStyle = 'rgba(255, 230, 120, 0.35)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath();
        ctx.moveTo(-7, 48);
        ctx.lineTo(0, 78);
        ctx.lineTo(7, 48);
        ctx.fill();
      }
      ctx.fillStyle = '#FFE27A';
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const cloudAlpha = 0.75 + (wCloud + wRain) * 0.25;
    ctx.globalAlpha = cloudAlpha;
    // Tono intermedio para la parte de abajo de las nubes.
    this.cloudMid = rgbStr(mixRgb([this.Prgb.cloud, this.Prgb.cloudShade], [0.45, 0.55]));
    const clouds = Math.min(this.clouds.length, Math.round(BASE_CLOUDS * this.span));
    for (let i = 0; i < clouds; i++) {
      const c = this.clouds[i];
      this.drawCloud(ctx, c.x, c.y, c.s * (1 + wRain * 0.35));
    }
    ctx.globalAlpha = 1;

    this.drawHills(ctx, gy - 80, 46, 0.006, 0.013, this.walkX * 0.1, 'hillFar');
    this.drawTrees(ctx, gy - 34, wSnow);
    this.drawHills(ctx, gy - 22, 22, 0.009, 0.021, this.walkX * 0.3, 'hillMid');
    this.drawGarden(ctx, gy - 6, wSnow);
    this.drawRoadside(ctx, gy - 10, wSnow);

    if (wRain > 0.01) {
      ctx.fillStyle = `rgba(40, 60, 95, ${0.16 * wRain})`;
      ctx.fillRect(fx, -30, fw, gy + 30);
    }

    // Suelo y sendero. El sendero tiene relieve: borde de atrás en sombra, centro iluminado y
    // un canto más oscuro hacia la cámara.
    const rgb = this.Prgb;
    const ground = ctx.createLinearGradient(0, gy, 0, this.H);
    ground.addColorStop(0, P.ground);
    ground.addColorStop(1, P.groundDark);
    ctx.fillStyle = ground;
    ctx.fillRect(fx, gy - 10, fw, this.H - gy + 50);
    const path = ctx.createLinearGradient(0, gy - 6, 0, gy + 36);
    path.addColorStop(0, rgbStr(rgb.path, -0.1));
    path.addColorStop(0.3, rgbStr(rgb.path, 0.16));
    path.addColorStop(1, P.path);
    ctx.fillStyle = path;
    ctx.fillRect(fx, gy - 6, fw, 42);
    ctx.fillStyle = P.pathEdge;
    ctx.fillRect(fx, gy - 8, fw, 3);
    ctx.fillStyle = rgbStr(rgb.pathEdge, -0.12);
    ctx.fillRect(fx, gy + 36, fw, 7);
    ctx.fillStyle = rgbStr(rgb.path, 0.35);
    ctx.fillRect(fx, gy + 35, fw, 1.5);

    // Piedras: sombra, piedra y brillo, cada capa en un solo trazo.
    const stoneOff = this.walkX % 70;
    const [s0, s1] = this.visibleRange(70, 0, 30);
    const stones = [];
    for (let i = s0; i <= s1; i++) {
      const k = Math.floor(this.walkX / 70) + i;
      stones.push([i * 70 - stoneOff + 20 * hash(k), gy + 8 + 22 * hash(k + 5), 8 + 4 * hash(k + 9)]);
    }
    const stoneLayer = (color, dx, dy, k) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const [x, y, r] of stones) {
        ctx.moveTo(x + dx + r * k, y + dy);
        ctx.ellipse(x + dx, y + dy, r * k, 3.5 * k, 0, 0, TAU);
      }
      ctx.fill();
    };
    stoneLayer('rgba(70, 50, 25, 0.22)', 1.5, 2.5, 1);
    stoneLayer(P.pathEdge, 0, 0, 1);
    stoneLayer('rgba(255, 255, 255, 0.4)', -2, -1.2, 0.5);

    if (wRain > 0.02) {
      const off = this.walkX % 260;
      const [p0, p1] = this.visibleRange(260, 0, 140);
      for (let i = p0; i <= p1; i++) {
        const x = i * 260 - off + 90;
        ctx.fillStyle = `rgba(150, 185, 220, ${0.65 * wRain})`;
        ctx.beginPath();
        ctx.ellipse(x, gy + 20, 42, 7, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * wRain})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 20, gy + 18);
        ctx.lineTo(x + 6, gy + 18);
        ctx.stroke();
      }
    }

    // Matas de pasto entre el sendero y los controles
    ctx.fillStyle = P.groundDark;
    const tuftOff = this.walkX % 48;
    const [t0, t1] = this.visibleRange(48, 0, 20);
    for (let i = t0; i <= t1; i++) {
      const k = Math.floor(this.walkX / 48) + i;
      const x = i * 48 - tuftOff;
      const y = gy + 58 + 30 * hash(k + 2);
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x - 3, y - 12);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 3, y - 15);
      ctx.lineTo(x + 7, y);
      ctx.fill();
    }
    if (wSnow > 0.02) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * wSnow})`;
      ctx.beginPath();
      const [m0, m1] = this.visibleRange(52, 0, 40);
      for (let i = m0; i <= m1; i++) {
        const x = i * 52 - (this.walkX % 52);
        ctx.moveTo(x + 30, gy - 8);
        ctx.ellipse(x, gy - 8, 30, 6, 0, 0, TAU);
      }
      ctx.fill();
    }
  }

  drawCloud(ctx, x, y, s) {
    const puffs = [
      [-40, 8, 26],
      [-14, -6, 32],
      [18, -10, 30],
      [44, 6, 24],
      [0, 12, 30],
    ];
    ctx.fillStyle = this.P.cloudShade;
    ctx.beginPath();
    for (const [dx, dy, r] of puffs) {
      ctx.moveTo(x + dx * s + r * s, y + dy * s + 7);
      ctx.arc(x + dx * s, y + dy * s + 7, r * s, 0, TAU);
    }
    ctx.fill();
    const g = ctx.createLinearGradient(0, y - 40 * s, 0, y + 42 * s);
    g.addColorStop(0, this.P.cloud);
    g.addColorStop(0.55, this.P.cloud);
    g.addColorStop(1, this.cloudMid);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (const [dx, dy, r] of puffs) {
      ctx.moveTo(x + dx * s + r * s, y + dy * s);
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    }
    ctx.fill();
  }

  // `key`: color de la paleta. La cima recibe más luz que la base y tiene un borde iluminado.
  // Se rellena solo hasta donde empieza el suelo, que la tapa por debajo.
  drawHills(ctx, base, amp, f1, f2, off, key) {
    const rgb = this.Prgb[key];
    const x0 = Math.floor((this.left - 30) / 15) * 15;
    const x1 = this.right + 30;
    const bottom = this.groundY;
    const ridge = () => {
      for (let x = x0; x <= x1 + 15; x += 15) {
        const wx = x + off;
        ctx.lineTo(x, base - amp * (0.6 * Math.sin(wx * f1 + 1.3) + 0.4 * Math.sin(wx * f2 + 0.4)));
      }
    };
    const g = ctx.createLinearGradient(0, base - amp, 0, base + 50);
    g.addColorStop(0, rgbStr(rgb, 0.14));
    g.addColorStop(1, rgbStr(rgb, -0.1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, bottom);
    ridge();
    ctx.lineTo(x1 + 15, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgbStr(rgb, 0.32);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ridge();
    ctx.stroke();
  }

  // Árboles y jardín se dibujan por lotes (un solo trazo por color) para que el mundo ancho
  // de las pantallas grandes no multiplique las operaciones de dibujo.
  drawTrees(ctx, base, wSnow) {
    const spacing = 150;
    const off = this.walkX * 0.4;
    const [k0, k1] = this.visibleRange(spacing, off, 170);
    const round = [];
    const pines = [];
    ctx.fillStyle = '#7A5638';
    for (let k = k0; k <= k1; k++) {
      const x = k * spacing - off + 80 * hash(k);
      if (x < this.left - 90 || x > this.right + 90) continue;
      const s = 0.75 + 0.5 * hash(k + 3);
      ctx.fillRect(x - 5 * s, base - 42 * s, 10 * s, 44 * s);
      (hash(k + 7) > 0.45 ? round : pines).push([x, s]);
    }
    ctx.fillStyle = '#A07650';
    for (const [x, s] of round.concat(pines)) ctx.fillRect(x - 5 * s, base - 42 * s, 3.5 * s, 44 * s);
    const treeLight = rgbStr(this.Prgb.tree, 0.2);
    const snow = wSnow > 0.02 ? `rgba(255, 255, 255, ${0.95 * wSnow})` : null;

    ctx.fillStyle = this.P.treeDark;
    ctx.beginPath();
    for (const [x, s] of round) {
      ctx.moveTo(x + 36 * s, base - 52 * s);
      ctx.arc(x + 6 * s, base - 52 * s, 30 * s, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = this.P.tree;
    ctx.beginPath();
    for (const [x, s] of round) {
      ctx.moveTo(x + 30 * s, base - 64 * s);
      ctx.arc(x, base - 64 * s, 30 * s, 0, TAU);
      ctx.moveTo(x + 2 * s, base - 48 * s);
      ctx.arc(x - 20 * s, base - 48 * s, 22 * s, 0, TAU);
      ctx.moveTo(x + 44 * s, base - 50 * s);
      ctx.arc(x + 22 * s, base - 50 * s, 22 * s, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = treeLight;
    ctx.beginPath();
    for (const [x, s] of round) {
      ctx.moveTo(x + 6 * s, base - 76 * s);
      ctx.arc(x - 8 * s, base - 76 * s, 14 * s, 0, TAU);
      ctx.moveTo(x - 18 * s, base - 54 * s);
      ctx.arc(x - 27 * s, base - 54 * s, 9 * s, 0, TAU);
    }
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      ctx.beginPath();
      for (const [x, s] of round) {
        ctx.moveTo(x + 24 * s, base - 86 * s);
        ctx.ellipse(x, base - 86 * s, 24 * s, 10 * s, 0, 0, TAU);
      }
      ctx.fill();
    }

    // Pinos: tres pisos, de abajo hacia arriba, cada uno con su nieve antes del siguiente.
    // La mitad izquierda va iluminada y la derecha en sombra.
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = this.P.treeDark;
      ctx.beginPath();
      for (const [x, s] of pines) {
        const ty = base - 30 * s - j * 26 * s;
        const tw = (40 - j * 9) * s;
        ctx.moveTo(x - tw, ty);
        ctx.lineTo(x, ty - 44 * s);
        ctx.lineTo(x + tw, ty);
        ctx.closePath();
      }
      ctx.fill();
      ctx.fillStyle = this.P.tree;
      ctx.beginPath();
      for (const [x, s] of pines) {
        const ty = base - 30 * s - j * 26 * s;
        const tw = (40 - j * 9) * s;
        ctx.moveTo(x - tw, ty);
        ctx.lineTo(x, ty - 44 * s);
        ctx.lineTo(x + 2 * s, ty);
        ctx.closePath();
      }
      ctx.fill();
      if (snow) {
        ctx.fillStyle = snow;
        ctx.beginPath();
        for (const [x, s] of pines) {
          const ty = base - 30 * s - j * 26 * s;
          const tw = (40 - j * 9) * s;
          ctx.moveTo(x - tw * 0.35, ty - 28 * s);
          ctx.lineTo(x, ty - 44 * s);
          ctx.lineTo(x + tw * 0.35, ty - 28 * s);
          ctx.closePath();
        }
        ctx.fill();
      }
    }
  }

  // Cara del cartel, foto del producto y frasco recortado, preparados una sola vez. Se rehacen
  // cuando termina de cargar alguna imagen o la fuente.
  brandSprites() {
    const { product: productSrc, logo: logoSrc, bottleCrop } = this.brand;
    const product = loadImage(productSrc);
    const logo = loadImage(logoSrc);
    const key = `${!!product}|${!!logo}|${this.fontsReady}`;
    if (this.sprites?.key === key) return this.sprites;

    const { w, h, border, photo: photoH } = BILLBOARD;
    const fw = w - border * 2;
    const fh = h - border * 2;
    const face = makeSprite(fw, fh, (c) => drawBillboardFace(c, fw, fh, this.font, logo));
    let photo = null;
    let bottle = null;
    let handBottle = null;
    if (product) {
      const pw = (photoH * product.naturalWidth) / product.naturalHeight;
      photo = makeSprite(pw + SPRITE_PAD * 2, photoH + SPRITE_PAD * 2, (c, px) => {
        c.shadowColor = 'rgba(30, 10, 40, 0.4)';
        c.shadowBlur = 6 * px;
        c.shadowOffsetX = 2 * px;
        c.shadowOffsetY = 3 * px;
        c.drawImage(product, SPRITE_PAD, SPRITE_PAD, pw, photoH);
      });
      if (bottleCrop) {
        const crop = (bh) => {
          const bw = (bh * bottleCrop.w) / bottleCrop.h;
          return makeSprite(bw, bh, (c) =>
            c.drawImage(product, bottleCrop.x, bottleCrop.y, bottleCrop.w, bottleCrop.h, 0, 0, bw, bh)
          );
        };
        bottle = crop(BOTTLE_STAND.bottle);
        handBottle = crop(HAND_BOTTLE);
      }
    }
    this.sprites = { key, face, photo, bottle, handBottle };
    return this.sprites;
  }

  // Carteles y frasco gigante alternados junto al camino, sobre `base`.
  drawRoadside(ctx, base, wSnow) {
    if (!this.brand) return;
    const sprites = this.brandSprites();
    const off = this.walkX * PROP_PARALLAX;
    const [k0, k1] = this.visibleRange(PROP_SPACING, off, PROP_MARGIN);
    for (let k = k0; k <= k1; k++) {
      const x = k * PROP_SPACING - off + 50 * hash(k + 41);
      if (x < this.left - PROP_MARGIN || x > this.right + PROP_MARGIN) continue;
      const t = this.t + k * 1.7;
      if (k & 1) {
        drawBottleDisplay(ctx, { x, y: base, t, bottle: sprites.bottle, font: this.font, snow: wSnow });
      } else {
        // Muestra el canto que da al centro de la pantalla, como un objeto con grosor.
        const side = clamp((W / 2 - x) / (W * 0.6), -1, 1);
        drawBillboard(ctx, { x, y: base, t, face: sprites.face, photo: sprites.photo, snow: wSnow, side });
      }
    }
  }

  drawGarden(ctx, base, wSnow) {
    const spacing = 96;
    const off = this.walkX * 0.75;
    const [k0, k1] = this.visibleRange(spacing, off, 100);
    const bushes = [];
    const flowers = [];
    for (let k = k0; k <= k1; k++) {
      const x = k * spacing - off + 30 * hash(k + 11);
      if (x < this.left - 60 || x > this.right + 60) continue;
      if (hash(k + 13) > 0.35) bushes.push([x, 16 + 10 * hash(k + 17)]);
      // Pequeñas equináceas del jardín
      const n = 1 + Math.floor(hash(k + 19) * 3);
      for (let f = 0; f < n; f++) {
        const fx = x + 18 + f * 13;
        const fh = 26 + 18 * hash(k * 3 + f);
        flowers.push([fx, fh, Math.sin(this.t * 1.8 + k + f) * 2]);
      }
    }

    ctx.fillStyle = this.P.bush;
    ctx.beginPath();
    for (const [x, r] of bushes) {
      ctx.moveTo(x - r, base - r * 0.6);
      ctx.arc(x, base - r * 0.6, r, Math.PI, 0);
      ctx.arc(x + r * 0.9, base - r * 0.35, r * 0.75, Math.PI, 0);
      ctx.arc(x - r * 0.9, base - r * 0.35, r * 0.7, Math.PI, 0);
      ctx.closePath();
    }
    ctx.fill();
    ctx.fillStyle = rgbStr(this.Prgb.bush, 0.22);
    ctx.beginPath();
    for (const [x, r] of bushes) {
      ctx.moveTo(x - r * 0.2 + r * 0.38, base - r * 1.05);
      ctx.arc(x - r * 0.2, base - r * 1.05, r * 0.38, 0, TAU);
    }
    ctx.fill();
    if (wSnow > 0.02) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * wSnow})`;
      ctx.beginPath();
      for (const [x, r] of bushes) {
        ctx.moveTo(x + r * 0.75, base - r * 1.45);
        ctx.ellipse(x, base - r * 1.45, r * 0.75, r * 0.28, 0, 0, TAU);
      }
      ctx.fill();
    }

    ctx.strokeStyle = this.P.grassDark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const [fx, fh, sway] of flowers) {
      ctx.moveTo(fx, base);
      ctx.quadraticCurveTo(fx, base - fh * 0.6, fx + sway, base - fh);
    }
    ctx.stroke();

    // Pétalos pequeños (punta en (0,-11)), girados a mano para juntar todo en un solo trazo.
    ctx.fillStyle = COLORS.pink;
    ctx.beginPath();
    for (const [fx, fh, sway] of flowers) {
      const cx = fx + sway;
      const cy = base - fh;
      for (let i = 0; i < 8; i++) {
        const [c, s] = PETAL_DIRS[i];
        // Puntos (4,-5), (0,-11) y (-4,-5) del pétalo, girados.
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + 4 * c + 5 * s, cy + 4 * s - 5 * c, cx + 11 * s, cy - 11 * c);
        ctx.quadraticCurveTo(cx - 4 * c + 5 * s, cy - 4 * s - 5 * c, cx, cy);
      }
    }
    ctx.fill();
    ctx.fillStyle = COLORS.coneDark;
    ctx.beginPath();
    for (const [fx, fh, sway] of flowers) {
      ctx.moveTo(fx + sway + 4.2, base - fh - 1);
      ctx.arc(fx + sway, base - fh - 1, 4.2, 0, TAU);
    }
    ctx.fill();
  }

  drawShieldBack(ctx, game, mode) {
    const C = this.center;
    const open = this.shieldOpen;
    if (open < 0.01) {
      if (mode === 'partida' && game.state === 'playing') {
        // Contorno discreto: muestra hasta dónde llega el escudo.
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + 0.08 * Math.sin(this.t * 3)})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 14]);
        ctx.lineDashOffset = -this.t * 20;
        ctx.beginPath();
        ctx.arc(C.x, C.y, SHIELD.radius, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    const R = (SHIELD.radius + this.bloomVis * 6) * (0.55 + 0.45 * easeOutBack(open));
    const g = ctx.createRadialGradient(C.x, C.y, R * 0.2, C.x, C.y, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.7, `rgba(255, 196, 222, ${0.16 * open})`);
    g.addColorStop(1, `rgba(255, 150, 196, ${0.42 * open})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(C.x, C.y, R, 0, TAU);
    ctx.fill();
    if (this.bloomVis > 2.2) {
      const halo = ctx.createRadialGradient(C.x, C.y, R, C.x, C.y, R + 40);
      halo.addColorStop(0, `rgba(255, 220, 120, ${0.35 * open * (this.bloomVis - 2.2)})`);
      halo.addColorStop(1, 'rgba(255, 220, 120, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(C.x, C.y, R + 40, 0, TAU);
      ctx.fill();
    }
  }

  drawShieldFront(ctx) {
    const open = this.shieldOpen;
    if (open < 0.01) return;
    const C = this.center;
    const head = this.echiHead();
    const k = easeOutBack(open);
    const bloom = this.bloomVis;
    const R = SHIELD.radius + bloom * 6;

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * open})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(C.x, C.y, R * (0.55 + 0.45 * k), 0, TAU);
    ctx.stroke();

    const push = (a) => {
      let p = 0;
      for (const r of this.ripples) {
        const d = Math.cos(a - r.angle);
        if (d > 0) p += 16 * Math.pow(d, 6) * (1 - r.age / 0.45);
      }
      return p;
    };

    const ring = (n, radius, len, wid, fill, outline, rot, alpha) => {
      ctx.globalAlpha = alpha;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * TAU;
        const rr = radius + push(a);
        const px = lerp(head.x, C.x + Math.cos(a) * rr, k);
        const py = lerp(head.y, C.y + Math.sin(a) * rr, k);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.scale(0.4 + 0.6 * open, 0.4 + 0.6 * open);
        ctx.translate(0, len * 0.45);
        drawPetal(ctx, len, wid, fill, outline, null);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    if (bloom > 0.05) {
      const pale = petalGradient(ctx, 26, [
        [0, '#FFB3D1'],
        [1, '#FFF2F7'],
      ]);
      ring(16, R - 20, 26, 13, pale, null, -this.shieldRot * 1.3 + 0.2, Math.min(1, bloom) * open);
    }
    const n = 16 + Math.round(bloom) * 4;
    const len = 34 + bloom * 4;
    const pink = petalGradient(ctx, len, [
      [0, '#C2185B'],
      [0.5, COLORS.pink],
      [1, '#FF9CC2'],
    ]);
    ring(n, R, len, 15, pink, COLORS.pinkDark, this.shieldRot, open);

    if (bloom > 1.05) {
      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = Math.min(1, bloom - 1) * open;
      for (let i = 0; i < 10; i++) {
        const a = -this.shieldRot * 2 + (i / 10) * TAU;
        drawSparkle(ctx, C.x + Math.cos(a) * (R + 22), C.y + Math.sin(a) * (R + 22), 6 + 2 * Math.sin(this.t * 8 + i), this.t * 3);
      }
      ctx.globalAlpha = 1;
    }

    for (const r of this.ripples) {
      const q = r.age / 0.45;
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - q})`;
      ctx.lineWidth = 10 * (1 - q);
      ctx.beginPath();
      ctx.arc(C.x, C.y, R + 4 + q * 20, r.angle - 0.45, r.angle + 0.45);
      ctx.stroke();
    }
  }

  drawCharacters(ctx, game, mode) {
    const zone = mode === 'partida' && game.anyInZone();
    const e = this.echi;
    const pr = this.person;
    const tap = e.tapAge;
    const squash = tap < 0.6 ? Math.exp(-tap * 7) * Math.cos(tap * 22) : 0;
    const personExpr = pr.expr || (mode === 'resultado' ? 'happy' : 'idle');
    const echiExpr = e.expr || (zone ? 'alert' : 'idle');
    const glow = zone && this.shieldOpen < 0.5 ? 0.65 + 0.35 * Math.sin(this.t * 14) : 0;
    const bottle = this.brand ? this.brandSprites().handBottle : null;

    if (this.models?.ready) {
      this.drawPerson3D(ctx, personExpr, bottle);
      this.drawEchi3D(ctx, echiExpr, squash, glow);
      return;
    }
    // Mientras cargan los modelos 3D no se dibujan, para no ver el cambio de 2D a 3D.
    if (this.modelsPending) return;

    drawPerson(ctx, {
      x: this.personPos.x,
      y: this.personPos.y,
      t: this.t,
      walk: this.walkPhase,
      walking: this.walking,
      expr: personExpr,
      weights: this.weights,
      blink: pr.blink > 0,
      wave: mode === 'inicio' && Math.sin(this.t * 0.9 + 2) > 0.7 ? 1 : 0,
      bottle,
    });

    drawEchi(ctx, {
      x: this.echiPos.x,
      y: this.echiPos.y,
      scale: this.echiScale(),
      t: this.t,
      walk: this.walkPhase,
      hop: this.echiHop(),
      expr: echiExpr,
      look: e.look,
      bloom: this.bloomVis,
      arms: this.shieldOpen,
      squash,
      glow,
      blink: e.blink > 0,
      wave: e.wave,
    });
  }

  // Luz de los personajes 3D según el clima: más tenue y fría con lluvia o nieve.
  light3D() {
    const [, wCloud, wRain, wSnow] = this.weights;
    return {
      light: 1 - 0.15 * wCloud - 0.35 * wRain - 0.05 * wSnow,
      cool: 0.25 * wCloud + 0.8 * wRain + 0.6 * wSnow,
    };
  }

  // Persona 3D: camina moviendo piernas y brazos (models3d.js), rebota en cada paso y se viste
  // según el clima. Las expresiones se muestran con el cuerpo: saltitos de alegría, echarse atrás
  // del susto y saltar girando al celebrar.
  drawPerson3D(ctx, expr, bottle) {
    const { x, y } = this.personPos;
    const t = this.t;
    const pr = this.person;
    const w = this.walking;
    // El cuerpo sube cuando las piernas se cruzan y baja cuando están abiertas: dos rebotes por ciclo.
    let lift = Math.abs(Math.cos(this.walkPhase)) * 0.018 * w;
    let tilt = Math.sin(this.walkPhase) * 0.035 * w;
    let lean = 0.04 * w;
    let turn = pr.turn;
    if (expr === 'happy') lift += Math.abs(Math.sin(t * 9)) * 0.04;
    else if (expr === 'cheer') {
      lift += Math.abs(Math.sin(t * 7)) * 0.1;
      turn += Math.sin(t * 3.5) * 0.35;
    } else if (expr === 'oops') {
      lean = -0.2;
      tilt = Math.sin(t * 38) * 0.05;
    }
    tilt += Math.sin(t * 9) * 0.08 * pr.wave;
    lift += Math.abs(Math.sin(t * 9)) * 0.025 * pr.wave;

    softShadow(ctx, x + 6, y + 2, 38 * (1 - lift * 2), 8.5, 0.32);
    const res = this.models.draw(ctx, 'persona', {
      x,
      y,
      height: PERSON_3D_H,
      turn,
      tilt,
      lean,
      lift,
      phase: this.walkPhase,
      stride: w,
      rain: this.weights[2],
      snow: this.weights[3],
      ...this.light3D(),
    });
    if (bottle && res) this.drawHandBottle(ctx, res.hand, bottle, tilt);
  }

  // Frasco en la mano de la persona 3D, tomado por el costado y abajo para que la etiqueta con el
  // nombre quede a la vista; los dedos asoman por el borde.
  drawHandBottle(ctx, hand, bottle, tilt) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(0.06 + tilt * 0.5);
    ctx.drawImage(bottle.img, -bottle.w * 0.15, -bottle.h * 0.8, bottle.w, bottle.h);
    const k = (this.t % 3.5) / 0.7;
    if (k < 1) {
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      drawSparkle(ctx, bottle.w * 0.7, -bottle.h * 0.7, 7, k * 2);
      ctx.globalAlpha = 1;
    }
    const skin = ctx.createRadialGradient(-1.5, -2, 0.5, 0, 0, 6.5);
    skin.addColorStop(0, '#FFE6D8');
    skin.addColorStop(1, '#EBB49A');
    ctx.fillStyle = skin;
    ctx.strokeStyle = 'rgba(170, 100, 75, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 6.5, 0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Echi 3D: da pasitos y salta al caminar aleteando sus hojas, se aplasta al tocarlo, levanta las
  // hojas al lanzar el escudo y salta de alegría. El brillo de «¡ahora!» y la flor de racha se
  // dibujan detrás, en 2D.
  drawEchi3D(ctx, expr, squash, glow) {
    const { x, y } = this.echiPos;
    const t = this.t;
    const e = this.echi;
    const s = this.echiScale();
    let lift = this.echiHop() / ECHI_3D_H;
    let sx = 1 + squash * 0.16;
    let sy = 1 - squash * 0.14;
    let tilt = Math.sin(this.walkPhase) * 0.05 * this.walking;
    let lean = 0;
    let turn = e.turn;
    // Aleteo: suave al caminar, arriba con el escudo abierto, rápido al celebrar.
    let leaf = 0.08 + 0.14 * Math.sin(this.walkPhase * 2) * this.walking;
    if (expr === 'cast') {
      sy *= 1.07;
      sx *= 0.96;
    } else if (expr === 'happy') {
      lift += Math.abs(Math.sin(t * 10)) * 0.05;
      leaf = 0.35 + 0.15 * Math.sin(t * 12);
    } else if (expr === 'cheer') {
      lift += Math.abs(Math.sin(t * 7)) * 0.1;
      turn += Math.sin(t * 5) * 0.5;
      leaf = 0.55 + 0.3 * Math.sin(t * 14);
    } else if (expr === 'worried') {
      tilt += Math.sin(t * 30) * 0.06;
      leaf = -0.15 + 0.05 * Math.sin(t * 30);
    } else if (expr === 'alert') {
      lean = 0.08;
      leaf = 0.3;
    }
    leaf = lerp(leaf, 0.95, this.shieldOpen) + 0.25 * e.wave * (0.5 + 0.5 * Math.sin(t * 10));
    tilt += Math.sin(t * 10) * 0.08 * e.wave;

    const head = this.echiHead();
    if (glow > 0) {
      const g = ctx.createRadialGradient(head.x, head.y, 20, head.x, head.y, 110);
      g.addColorStop(0, `rgba(255, 220, 90, ${0.55 * glow})`);
      g.addColorStop(1, 'rgba(255, 220, 90, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 110, 0, TAU);
      ctx.fill();
    }
    if (this.bloomVis > 0.02) {
      // Flor de racha: un anillo de pétalos que gira detrás de la cabeza.
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(t * 0.4);
      ctx.globalAlpha = Math.min(1, this.bloomVis);
      const len = (30 + Math.min(this.bloomVis, 3) * 6) * s;
      for (let i = 0; i < 16; i++) {
        ctx.save();
        ctx.rotate((i / 16) * TAU);
        ctx.translate(0, -62 * s);
        drawPetal(ctx, len, 16 * s, COLORS.pinkLight, null, null);
        ctx.restore();
      }
      ctx.restore();
    }

    softShadow(ctx, x + 4, y + 1, 44 * s * (1 - lift * 2), 8.5, 0.3);
    this.models.draw(ctx, 'echi', {
      x,
      y,
      height: ECHI_3D_H * s,
      turn,
      tilt,
      lean,
      lift,
      sx,
      sy,
      phase: this.walkPhase,
      stride: this.walking,
      leaf,
      ...this.light3D(),
    });
  }

  drawCreatures(ctx, game) {
    const C = this.center;
    for (const c of game.creatures) {
      const p = this.creaturePos(c);
      const pal = paletteFor(c);
      const r = 27;
      const dx = C.x - p.x;
      const dy = C.y - p.y;
      const dl = Math.hypot(dx, dy) || 1;

      if (c.state === 'approach') {
        if (c.type === 1) {
          // Veloz: estela detrás
          ctx.fillStyle = pal.body;
          for (let k = 2; k >= 1; k--) {
            ctx.globalAlpha = 0.14 * (3 - k);
            ctx.beginPath();
            ctx.arc(p.x - (dx / dl) * 18 * k, p.y - (dy / dl) * 18 * k, r * p.scale * (1 - 0.15 * k), 0, TAU);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (c.hover) {
          // Dorado detenido: se carga antes de lanzarse
          const g = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 2.2);
          g.addColorStop(0, `rgba(255, 140, 30, ${0.35 + 0.2 * Math.sin(this.t * 25)})`);
          g.addColorStop(1, 'rgba(255, 140, 30, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.2, 0, TAU);
          ctx.fill();
        }

        const tti = game.timeToImpact(c);
        if (tti <= RING_TIME) {
          // Aro que se cierra sobre la criatura: dorado = ya se puede, blanco brillante = ¡perfecto!
          const k = clamp(tti / RING_TIME, 0, 1);
          const radius = r * p.scale + 12 + 56 * k;
          if (tti <= PERFECT_TIME) {
            ctx.strokeStyle = 'rgba(255, 210, 63, 0.75)';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, TAU);
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 5;
            ctx.stroke();
          } else {
            const inZone = tti <= ZONE_TIME;
            ctx.strokeStyle = inZone
              ? `rgba(255, 210, 63, ${0.8 + 0.2 * Math.sin(this.t * 20)})`
              : `rgba(255, 255, 255, ${0.25 + 0.45 * (1 - k)})`;
            ctx.lineWidth = inZone ? 5 : 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, TAU);
            ctx.stroke();
          }
        }
      }

      const shakeX = c.hover ? Math.sin(this.t * 70) * 2.5 : 0;
      drawCreature(ctx, {
        x: p.x + shakeX,
        y: p.y,
        r,
        t: this.t + c.id,
        pal,
        pointy: c.type === 1,
        expr: c.state === 'blocked' ? 'dizzy' : c.state === 'hit' ? 'tease' : 'grin',
        lookX: dx / dl,
        lookY: dy / dl,
        rot: p.rot,
        scale: p.scale,
        alpha: p.alpha,
        glow: c.state === 'approach' && c.inZone ? 0.7 + 0.3 * Math.sin(this.t * 18) : 0,
      });

      if (c.type === 2 && p.alpha > 0.1) {
        ctx.globalAlpha = p.alpha;
        drawCrown(ctx, p.x + shakeX, p.y - 33 * p.scale, p.scale);
        ctx.fillStyle = '#FFF4B8';
        for (let i = 0; i < 4; i++) {
          const a = this.t * 4 + (i / 4) * TAU;
          drawSparkle(ctx, p.x + Math.cos(a) * 46, p.y + Math.sin(a) * 46, 5 + 2 * Math.sin(this.t * 10 + i), a);
        }
        ctx.globalAlpha = 1;
      }

      // Insignia con lo que vale el virus: 1, 2 o 3 puntos.
      if (c.state === 'approach' && p.scale > 0.3) {
        const bx = p.x + shakeX + 25 * p.scale;
        const by = p.y - 25 * p.scale;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, 11, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = pal.dark;
        ctx.font = `800 15px ${this.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(CREATURE_TYPES[c.type].points), bx, by + 1);
      }

      if (c.state === 'blocked' && p.alpha > 0.1) {
        ctx.fillStyle = COLORS.gold;
        ctx.globalAlpha = p.alpha;
        for (let i = 0; i < 3; i++) {
          const a = this.t * 7 + (i / 3) * TAU;
          drawSparkle(ctx, p.x + Math.cos(a) * 26, p.y - 34 + Math.sin(a) * 8, 7, a);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === 'petal') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        drawPetal(ctx, p.size, p.size * 0.48, p.color, null, null);
        ctx.restore();
      } else if (p.type === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        drawSparkle(ctx, p.x, p.y, p.size * (0.4 + 0.6 * a), p.rot);
        ctx.globalAlpha = 1;
      } else if (p.type === 'ring') {
        ctx.strokeStyle = `rgba(${p.color},${a})`;
        ctx.lineWidth = p.width * a + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, lerp(p.r1, p.r0, a), 0, TAU);
        ctx.stroke();
      } else if (p.type === 'rays') {
        // Destello en estrella: rayos que salen disparados y se acortan.
        const inner = lerp(p.r0, p.r1, easeOutCubic(1 - a));
        const outer = inner + (p.r1 - p.r0) * 0.45 * a;
        ctx.strokeStyle = `rgba(${p.color},${Math.min(1, a * 1.5)})`;
        ctx.lineWidth = p.width * a + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < p.n; i++) {
          const ang = p.rot + (i / p.n) * TAU;
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          ctx.moveTo(p.x + ca * inner, p.y + sa * inner);
          ctx.lineTo(p.x + ca * outer, p.y + sa * outer);
        }
        ctx.stroke();
      } else if (p.type === 'puff') {
        ctx.fillStyle = `rgba(${p.color},${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.5 - a * 0.7), 0, TAU);
        ctx.fill();
      } else if (p.type === 'splash') {
        ctx.strokeStyle = `rgba(230, 240, 255, ${a * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 8 * (1.4 - a), 2.5 * (1.4 - a), 0, 0, TAU);
        ctx.stroke();
      }
    }
  }

  drawForeground(ctx) {
    const base = this.H;
    const off = (this.walkX * 1.25) % 34;
    const g = ctx.createLinearGradient(0, base - 50, 0, base);
    g.addColorStop(0, rgbStr(this.Prgb.grass, 0.12));
    g.addColorStop(1, this.P.grassDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    const [g0, g1] = this.visibleRange(34, 0, 20);
    for (let i = g0; i <= g1; i++) {
      const x = i * 34 - off;
      const h = 28 + 22 * hash(Math.floor((this.walkX * 1.25) / 34) + i);
      ctx.moveTo(x - 12, base);
      ctx.quadraticCurveTo(x - 6, base - h * 0.6, x - 2, base - h);
      ctx.quadraticCurveTo(x, base - h * 0.5, x + 4, base);
      ctx.moveTo(x + 2, base);
      ctx.quadraticCurveTo(x + 10, base - h * 0.5, x + 16, base - h * 0.8);
      ctx.quadraticCurveTo(x + 12, base - h * 0.35, x + 12, base);
    }
    ctx.fill();
  }

  // Flor de racha junto a la persona: un pétalo por bloqueo seguido y el multiplicador debajo.
  drawCombo(ctx) {
    const cb = this.combo;
    if (cb.shown < 0.02) return;
    const x = 66;
    const y = this.groundY - 178;
    const s = (0.6 + 0.4 * cb.shown) * (1 + 0.3 * easeOutCubic(cb.pop));
    ctx.save();
    ctx.globalAlpha = cb.shown;
    ctx.translate(x, y);
    ctx.scale(s, s);

    const petals = Math.min(cb.value, 15);
    ctx.save();
    ctx.rotate(this.t * 0.6);
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i / 15) * TAU);
      ctx.translate(0, -30);
      drawPetal(ctx, 24, 13, i % 2 ? COLORS.pinkLight : COLORS.pink, COLORS.pinkDark, null);
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = COLORS.pink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 33, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.pinkDark;
    ctx.font = `800 ${cb.value >= 10 ? 28 : 32}px ${this.font}`;
    ctx.fillText(String(cb.value), 0, -4);
    ctx.font = `800 11px ${this.font}`;
    ctx.fillStyle = '#8A5A70';
    ctx.fillText('RACHA', 0, 17);
    ctx.restore();
  }

  // Flechas en el borde para criaturas que todavía están fuera de la pantalla.
  drawEdgeArrows(ctx, game) {
    for (const c of game.creatures) {
      if (c.state !== 'approach') continue;
      const p = this.creaturePos(c);
      if (p.x > this.left - 14 && p.x < this.right + 14) continue;
      const left = p.x < this.left;
      const ax = left ? this.left + 16 : this.right - 16;
      const ay = clamp(p.y, 170, this.groundY - 60);
      const tti = game.timeToImpact(c);
      const urgency = clamp(1 - (tti - ZONE_TIME) / 2.5, 0.35, 1);
      const pal = paletteFor(c);
      const size = 11 + 9 * urgency;
      ctx.save();
      ctx.translate(ax, ay);
      if (left) ctx.scale(-1, 1);
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(this.t * 6));
      ctx.fillStyle = pal.body;
      ctx.strokeStyle = pal.outline;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(size * 0.7, 0);
      ctx.lineTo(-size * 0.5, -size * 0.75);
      ctx.lineTo(-size * 0.5, size * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawWeather(ctx) {
    const rainCount = Math.round(this.rain.length * this.weights[2]);
    if (rainCount > 0) {
      ctx.strokeStyle = 'rgba(225, 238, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < rainCount; i++) {
        const d = this.rain[i];
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * 0.22, d.y - d.len);
      }
      ctx.stroke();
    }
    const snowCount = Math.round(this.snow.length * this.weights[3]);
    if (snowCount > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      for (let i = 0; i < snowCount; i++) {
        const f = this.snow[i];
        ctx.moveTo(f.x + f.r, f.y);
        ctx.arc(f.x, f.y, f.r, 0, TAU);
      }
      ctx.fill();
    }
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const tx of this.texts) {
      const age = tx.max - tx.life;
      const pop = age < 0.18 ? easeOutBack(age / 0.18) : 1;
      const alpha = clamp(tx.life / 0.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(tx.x, tx.y);
      ctx.scale(pop, pop);
      ctx.font = `800 ${tx.size}px ${this.font}`;
      ctx.strokeStyle = tx.stroke;
      ctx.lineWidth = tx.size * 0.22;
      ctx.strokeText(tx.text, 0, 0);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, 0, 0);
      ctx.restore();
    }
  }

  // Ayuda de la primera partida: Echi pide que lo toquen y una mano indica el momento.
  drawHint(ctx, game) {
    const head = this.echiHead();
    if (game.anyInZone() && !game.shield.active) {
      drawSpeechBubble(ctx, head.x, head.y - 72, '¡Ahora!', this.font, 26);
      const bob = Math.abs(Math.sin(this.t * 9)) * 12;
      ctx.save();
      ctx.font = `46px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👆', head.x + 30, head.y + 52 + bob);
      ctx.restore();
    } else if (game.time < 6 && !game.shield.active) {
      drawSpeechBubble(ctx, head.x - 20, head.y - 72, '¡Tócame cuando brillen!', this.font, 19);
    }
  }
}

// Direcciones (coseno, seno) de los 8 pétalos de las flores del jardín.
const PETAL_DIRS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * TAU + Math.PI / 2;
  return [Math.cos(a), Math.sin(a)];
});
