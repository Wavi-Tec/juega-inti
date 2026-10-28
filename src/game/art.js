// Dibujo vectorial de personajes con Canvas 2D. Cada función recibe el contexto y un objeto
// de opciones; dibuja en coordenadas lógicas (pantalla de 540 de ancho) y no guarda estado.

export const TAU = Math.PI * 2;

export const COLORS = {
  pink: '#E5407F',
  pinkDark: '#A8134F',
  pinkLight: '#FF9CC2',
  pinkPale: '#FFD6E6',
  green: '#2E9E5B',
  greenDark: '#1C6A3B',
  greenLight: '#5CC27E',
  cone: '#F08A2C',
  coneDark: '#B4521A',
  coneLight: '#FFC067',
  ink: '#3B1606',
  gold: '#FFD23F',
};

export const CREATURE_PALETTES = [
  // nublado
  { body: '#A45BDB', light: '#CFA2F2', dark: '#6F31A6', outline: '#3B1361', knob: '#FF7FA6' },
  // lluvia
  { body: '#2FB3C6', light: '#8BE2EA', dark: '#1B7C99', outline: '#0D3B52', knob: '#FFD45C' },
  // nieve
  { body: '#7F93F2', light: '#C9D3FF', dark: '#5160C9', outline: '#222A6E', knob: '#FFFFFF' },
];

export const GOLDEN_PALETTE = { body: '#FFCC2E', light: '#FFF2A6', dark: '#DE9A00', outline: '#6B3F00', knob: '#FF7FA6' };
export const VELOZ_PALETTE = { body: '#FF8A3D', light: '#FFC79A', dark: '#D9531C', outline: '#5C1A05', knob: '#FFE066' };

export function drawCrown(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#FFD23F';
  ctx.strokeStyle = '#6B3F00';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-14, -8);
  ctx.lineTo(-6, -2);
  ctx.lineTo(0, -12);
  ctx.lineTo(6, -2);
  ctx.lineTo(14, -8);
  ctx.lineTo(12, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FF7FA6';
  ctx.beginPath();
  ctx.arc(0, 1, 2.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOutBack = (k) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColors(rgbList, weights) {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < rgbList.length; i++) {
    const w = weights[i];
    if (!w) continue;
    r += rgbList[i][0] * w;
    g += rgbList[i][1] * w;
    b += rgbList[i][2] * w;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ── Formas base ────────────────────────────────────────────────────────────

// Pétalo de equinácea apuntando hacia -y, con la punta dentada característica.
export function petalPath(ctx, len, wid) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid * 0.8, -len * 0.15, wid * 0.62, -len * 0.8, wid * 0.32, -len);
  ctx.quadraticCurveTo(wid * 0.14, -len * 1.03, 0, -len * 0.94);
  ctx.quadraticCurveTo(-wid * 0.14, -len * 1.03, -wid * 0.32, -len);
  ctx.bezierCurveTo(-wid * 0.62, -len * 0.8, -wid * 0.8, -len * 0.15, 0, 0);
  ctx.closePath();
}

export function drawPetal(ctx, len, wid, fill, outline, vein) {
  petalPath(ctx, len, wid);
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(1.2, wid * 0.1);
    ctx.stroke();
  }
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = Math.max(1, wid * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.18);
    ctx.lineTo(0, -len * 0.78);
    ctx.stroke();
  }
}

function leafPath(ctx, len, wid) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
  ctx.closePath();
}

export function drawSparkle(ctx, x, y, r, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.32, Math.sin(a + Math.PI / 4) * r * 0.32);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawSpeechBubble(ctx, x, y, text, font, size = 20) {
  ctx.save();
  ctx.font = `800 ${size}px ${font}`;
  const w = ctx.measureText(text).width + size * 1.1;
  const h = size * 1.75;
  ctx.fillStyle = 'rgba(40, 20, 40, 0.18)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h + 4, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, h / 2);
  ctx.moveTo(x - 8, y - 1);
  ctx.lineTo(x, y + 10);
  ctx.lineTo(x + 8, y - 1);
  ctx.fill();
  ctx.fillStyle = COLORS.pinkDark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2 + 1);
  ctx.restore();
}

// ── Echi: equinácea con cara ───────────────────────────────────────────────

// Textura de semillas del cono, solo en el borde para dejar la cara despejada.
const CONE_DOTS = Array.from({ length: 60 }, (_, i) => {
  const a = i * 2.39996;
  const r = Math.sqrt((i + 0.5) / 60);
  return [Math.cos(a) * r, Math.sin(a) * r];
}).filter(([x, y]) => Math.hypot(x, y) > 0.7);

/**
 * opciones: x, y (suelo), t, walk (fase de paso), hop, expr ('idle'|'alert'|'cast'|'happy'|
 * 'worried'|'cheer'), look (-1..1), bloom (0..3), arms (0..1 brazos arriba), squash, glow (0..1),
 * scale, blink, wave (0..1 saludo)
 */
export function drawEchi(ctx, o) {
  const {
    x,
    y,
    t = 0,
    walk = 0,
    hop = 0,
    expr = 'idle',
    look = 0,
    bloom = 0,
    arms = 0,
    squash = 0,
    glow = 0,
    scale = 1,
    blink = false,
    wave = 0,
  } = o;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(30, 50, 30, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 26 - hop * 0.6, 6.5 - hop * 0.12, 0, 0, TAU);
  ctx.fill();

  ctx.translate(0, -hop);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pies: dos hojitas que se alternan al caminar.
  const step = Math.sin(walk);
  for (const s of [-1, 1]) {
    const lift = Math.max(0, step * s) * 4;
    ctx.save();
    ctx.translate(s * 9, -3 - lift);
    ctx.fillStyle = COLORS.greenLight;
    ctx.strokeStyle = COLORS.greenDark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(s * 3, 0, 10, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Tallo
  const sway = Math.sin(t * 2.2) * 3;
  const headY = -98;
  ctx.strokeStyle = COLORS.greenDark;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(sway, -40, sway * 0.5, headY + 24);
  ctx.stroke();
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 6.5;
  ctx.stroke();

  // Hojas-brazos
  const armY = -50;
  const wig = Math.sin(t * 3) * 0.12;
  let left = lerp(Math.PI + 0.3 + wig, Math.PI + 1.05, arms);
  let right = lerp(-0.3 - wig, -1.05, arms);
  if (wave > 0) right = lerp(right, -1.1 + Math.sin(t * 11) * 0.45, wave);
  for (const [ang, s] of [
    [left, -1],
    [right, 1],
  ]) {
    ctx.save();
    ctx.translate(sway * 0.6 + s * 2, armY);
    ctx.rotate(ang);
    leafPath(ctx, 34, 13);
    ctx.fillStyle = COLORS.greenLight;
    ctx.fill();
    ctx.strokeStyle = COLORS.greenDark;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(28, 0);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  // Cabeza
  ctx.save();
  ctx.translate(sway * 0.5, headY);
  ctx.scale(1 + squash * 0.16, 1 - squash * 0.14);

  if (glow > 0) {
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 92);
    g.addColorStop(0, `rgba(255, 220, 90, ${0.6 * glow})`);
    g.addColorStop(1, 'rgba(255, 220, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, TAU);
    ctx.fill();
  }

  if (bloom > 0) {
    const n = 14;
    ctx.save();
    ctx.rotate(t * 0.4);
    ctx.globalAlpha = Math.min(1, bloom);
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * TAU + Math.PI / n);
      drawPetal(ctx, 58 + Math.min(bloom, 3) * 5, 20, COLORS.pinkLight, null, null);
      ctx.restore();
    }
    ctx.restore();
  }

  const petals = 13;
  for (let i = 0; i < petals; i++) {
    const a = -Math.PI / 2 + (i / petals) * TAU + Math.sin(t * 2 + i) * 0.03;
    // Los pétalos de la equinácea caen hacia abajo: los inferiores son más largos.
    const len = 46 + 9 * Math.max(0, Math.sin(a)) + arms * 4;
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    drawPetal(ctx, len, 19, COLORS.pink, COLORS.pinkDark, '#FF8DB8');
    ctx.restore();
  }

  const cg = ctx.createRadialGradient(-9, -11, 3, 0, 0, 34);
  cg.addColorStop(0, COLORS.coneLight);
  cg.addColorStop(0.55, COLORS.cone);
  cg.addColorStop(1, COLORS.coneDark);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7E340C';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(122, 46, 10, 0.32)';
  for (const [dx, dy] of CONE_DOTS) {
    ctx.beginPath();
    ctx.arc(dx * 28, dy * 28, 2.3, 0, TAU);
    ctx.fill();
  }

  drawEchiFace(ctx, expr, look, blink);
  ctx.restore();

  ctx.restore();
}

function drawEchiFace(ctx, expr, look, blink) {
  const ink = COLORS.ink;
  const mouth = '#7A1E10';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const closedHappy = expr === 'cast' || expr === 'happy' || expr === 'cheer';
  if (closedHappy) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 11, 0, 5.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    const k = expr === 'alert' ? 1.15 : 1;
    for (const s of [-1, 1]) {
      const ex = s * 11;
      if (blink) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(ex - 5, -2);
        ctx.lineTo(ex + 5, -2);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(ex, -3, 6.6 * k, 8 * k, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(ex + look * 2, -2, 4.3 * k, 5.6 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex + look * 2 - 1.4, -4.6, 1.8, 0, TAU);
      ctx.fill();
    }
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.4;
  if (expr === 'alert') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 11, -10, 6, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    }
  } else if (expr === 'worried') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 5, -16);
      ctx.lineTo(s * 15, -13);
      ctx.stroke();
    }
  }

  if (expr === 'cast' || expr === 'cheer') {
    ctx.fillStyle = mouth;
    ctx.beginPath();
    ctx.arc(0, 7, 7.5, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FF7A95';
    ctx.beginPath();
    ctx.ellipse(0, 11.5, 3.8, 2.2, 0, 0, TAU);
    ctx.fill();
  } else if (expr === 'alert') {
    ctx.fillStyle = mouth;
    ctx.beginPath();
    ctx.ellipse(0, 10, 3.4, 4.2, 0, 0, TAU);
    ctx.fill();
  } else if (expr === 'worried') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-6, 11);
    ctx.quadraticCurveTo(-3, 8, 0, 11);
    ctx.quadraticCurveTo(3, 14, 6, 11);
    ctx.stroke();
  } else {
    const w = expr === 'happy' ? 8 : 6.2;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 5, w, Math.PI * 0.16, Math.PI * 0.84);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 98, 136, 0.55)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 19.5, 7, 5.2, 3.2, 0, 0, TAU);
    ctx.fill();
  }
}

// ── Persona ────────────────────────────────────────────────────────────────

const SKIN = '#F5C7A1';
const SKIN_LINE = '#C98A66';
const HAIR = '#4A2F23';
const PANTS = '#3B4A7A';
const PANTS_BACK = '#2E3A63';
// Abrigo según clima: sol, nublado, lluvia (impermeable), nieve (abrigo)
const COAT = ['#2E9E5B', '#2E9E5B', '#F2BE3C', '#3E7CC9'].map(hexToRgb);
const COAT_DARK = ['#1F7443', '#1F7443', '#C99520', '#2A5C9C'].map(hexToRgb);

/**
 * opciones: x, y (suelo), t, walk (fase), walking (0..1), expr ('idle'|'happy'|'oops'|'cheer'),
 * weights [sol, nublado, lluvia, nieve], scale, blink, wave (0..1)
 */
export function drawPerson(ctx, o) {
  const {
    x,
    y,
    t = 0,
    walk = 0,
    walking = 1,
    expr = 'idle',
    weights = [1, 0, 0, 0],
    scale = 1,
    blink = false,
    wave = 0,
  } = o;
  const rain = weights[2] || 0;
  const snow = weights[3] || 0;
  const coat = mixColors(COAT, weights);
  const coatDark = mixColors(COAT_DARK, weights);

  const sw = Math.sin(walk) * walking;
  const bob = -Math.abs(Math.cos(walk)) * 4 * walking;
  const cheer = expr === 'cheer';
  const oops = expr === 'oops';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(30, 50, 30, 0.2)';
  ctx.beginPath();
  ctx.ellipse(4, 2, 34, 7, 0, 0, TAU);
  ctx.fill();

  const lean = oops ? -0.08 : 0;
  ctx.rotate(lean);

  const hipY = -58 + bob;
  const shoulder = { x: 2, y: -112 + bob };

  // Ángulo de brazo medido desde "colgando hacia abajo"; π = arriba.
  let backArm = sw * 0.6;
  let frontArm = -sw * 0.6;
  // Los brazos levantados van hacia los lados para no tapar la cara.
  if (cheer) {
    backArm = Math.PI + 0.9 + Math.sin(t * 8) * 0.12;
    frontArm = 2.0 + Math.sin(t * 8 + 1) * 0.15;
  } else if (oops) {
    backArm = -1.0;
    frontArm = 1.25;
  }
  if (wave > 0) frontArm = lerp(frontArm, 1.95 + Math.sin(t * 9) * 0.3, wave);

  const limb = (fromX, fromY, ang, len, width, color) => {
    const ex = fromX + Math.sin(ang) * len;
    const ey = fromY + Math.cos(ang) * len;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    return [ex, ey];
  };

  // Brazo de atrás
  const [bhx, bhy] = limb(shoulder.x - 4, shoulder.y, backArm, 42, 13, coatDark);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(bhx, bhy, 7, 0, TAU);
  ctx.fill();

  // Piernas
  const legs = [
    [-sw * 0.5, PANTS_BACK, -4],
    [sw * 0.5, PANTS, 5],
  ];
  for (const [ang, color, dx] of legs) {
    const [fx, fy] = limb(dx, hipY, ang, 50, 15, color);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#33303F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(fx + 5, fy + 3, 11, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = COLORS.pink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx - 5, fy + 7);
    ctx.lineTo(fx + 15, fy + 7);
    ctx.stroke();
  }

  // Torso
  ctx.fillStyle = coat;
  ctx.strokeStyle = coatDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-23, -126 + bob, 46, 74, 18);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -118 + bob);
  ctx.lineTo(8, -56 + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(10, -84 + bob, 11, 12, 4);
  ctx.stroke();

  // Bufanda (nieve)
  if (snow > 0.02) {
    ctx.save();
    ctx.globalAlpha = snow;
    ctx.fillStyle = COLORS.pink;
    ctx.beginPath();
    ctx.roundRect(-20, -132 + bob, 42, 13, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, -124 + bob);
    ctx.quadraticCurveTo(-30, -112 + bob, -30 - sw * 5, -94 + bob);
    ctx.lineTo(-19 - sw * 5, -94 + bob);
    ctx.quadraticCurveTo(-18, -112 + bob, -4, -122 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-28 - sw * 4, -102 + bob);
    ctx.lineTo(-20 - sw * 4, -102 + bob);
    ctx.moveTo(-6, -131 + bob);
    ctx.lineTo(-6, -120 + bob);
    ctx.moveTo(8, -131 + bob);
    ctx.lineTo(8, -120 + bob);
    ctx.stroke();
    ctx.restore();
  }

  // Cabeza
  const hx = 6;
  const hy = -160 + bob;

  if (rain > 0.02) {
    // Capucha del impermeable (por detrás de la cabeza)
    ctx.save();
    ctx.globalAlpha = rain;
    ctx.fillStyle = '#F2BE3C';
    ctx.strokeStyle = '#C99520';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hx - 3, hy - 1, 40, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.roundRect(-3, -138 + bob, 14, 14, 4);
  ctx.fill();

  ctx.fillStyle = SKIN;
  ctx.strokeStyle = SKIN_LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, 33, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Pelo
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(hx, hy, 35, Math.PI * 0.92, Math.PI * 1.97);
  ctx.quadraticCurveTo(hx + 28, hy - 12, hx + 15, hy - 17);
  ctx.quadraticCurveTo(hx + 7, hy - 7, hx - 4, hy - 15);
  ctx.quadraticCurveTo(hx - 16, hy - 2, hx - 32, hy + 9);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx - 22, hy + 2, 13, 17, 0.2, 0, TAU);
  ctx.fill();

  // Oreja
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = SKIN_LINE;
  ctx.beginPath();
  ctx.ellipse(hx - 6, hy + 4, 6, 8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  if (rain > 0.02) {
    // Borde de la capucha sobre el pelo
    ctx.save();
    ctx.globalAlpha = rain;
    ctx.fillStyle = '#F2BE3C';
    ctx.strokeStyle = '#C99520';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 2, 38, Math.PI * 0.95, Math.PI * 1.92);
    ctx.quadraticCurveTo(hx + 18, hy - 22, hx - 4, hy - 20);
    ctx.quadraticCurveTo(hx - 22, hy - 14, hx - 34, hy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (snow > 0.02) {
    // Gorro con pompón
    ctx.save();
    ctx.globalAlpha = snow;
    ctx.fillStyle = COLORS.pink;
    ctx.strokeStyle = COLORS.pinkDark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hx, hy - 8, 34, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(hx - 37, hy - 15, 74, 13, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 2, hy - 45, 9, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Cara (mira hacia la derecha)
  const ink = '#2A1A14';
  ctx.lineCap = 'round';
  if (expr === 'happy' || cheer) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    for (const ex of [hx + 9, hx + 25]) {
      ctx.beginPath();
      ctx.arc(ex, hy + 3, 4.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (blink && !oops) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    for (const ex of [hx + 9, hx + 25]) {
      ctx.beginPath();
      ctx.moveTo(ex - 4, hy + 2);
      ctx.lineTo(ex + 4, hy + 2);
      ctx.stroke();
    }
  } else {
    const k = oops ? 1.25 : 1;
    for (const ex of [hx + 9, hx + 25]) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(ex, hy + 2, 4 * k, 5.4 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex - 1.2, hy - 0.4, 1.6, 0, TAU);
      ctx.fill();
    }
  }

  if (oops) {
    ctx.fillStyle = '#7A2A1E';
    ctx.beginPath();
    ctx.ellipse(hx + 18, hy + 17, 4, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8FD3FF';
    ctx.beginPath();
    ctx.moveTo(hx - 18, hy - 24);
    ctx.quadraticCurveTo(hx - 12, hy - 14, hx - 18, hy - 11);
    ctx.quadraticCurveTo(hx - 24, hy - 14, hx - 18, hy - 24);
    ctx.fill();
  } else if (expr === 'happy' || cheer) {
    ctx.fillStyle = '#7A2A1E';
    ctx.beginPath();
    ctx.arc(hx + 17, hy + 13, 7, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(hx + 17, hy + 11, 5.5, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 110, 130, 0.45)';
  ctx.beginPath();
  ctx.ellipse(hx + 3, hy + 12, 5, 3, 0, 0, TAU);
  ctx.ellipse(hx + 30, hy + 12, 4, 3, 0, 0, TAU);
  ctx.fill();

  // Brazo de delante
  const [fhx, fhy] = limb(shoulder.x + 6, shoulder.y, frontArm, 42, 13, coat);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(fhx, fhy, 7.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ── Criaturas ──────────────────────────────────────────────────────────────

/**
 * opciones: x, y, r, t, pal, expr ('grin'|'dizzy'|'tease'), lookX, lookY, rot, scale, alpha, glow,
 * pointy (espinas en punta en lugar de bolitas)
 */
export function drawCreature(ctx, o) {
  const {
    x,
    y,
    r = 27,
    t = 0,
    pal,
    expr = 'grin',
    lookX = 0,
    lookY = 0,
    rot = 0,
    scale = 1,
    alpha = 1,
    glow = 0,
    pointy = false,
  } = o;
  if (alpha <= 0.01 || scale <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bodyPath = () => {
    ctx.beginPath();
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + 0.05 * Math.sin(a * 5 + t * 6));
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  };

  // Espículas: en punta (veloz) o con bolitas
  const spikes = pointy ? 8 : 9;
  for (let j = 0; pointy && j < spikes; j++) {
    const a = (j / spikes) * TAU + Math.sin(t * 5 + j) * 0.08;
    const tip = r + 15;
    ctx.fillStyle = pal.knob;
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.26) * r * 0.86, Math.sin(a - 0.26) * r * 0.86);
    ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
    ctx.lineTo(Math.cos(a + 0.26) * r * 0.86, Math.sin(a + 0.26) * r * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (let j = 0; !pointy && j < spikes; j++) {
    const a = (j / spikes) * TAU + Math.sin(t * 3 + j) * 0.12;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx * r * 0.8, cy * r * 0.8);
    ctx.lineTo(cx * (r + 10), cy * (r + 10));
    ctx.stroke();
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = pal.knob;
    ctx.beginPath();
    ctx.arc(cx * (r + 11), cy * (r + 11), 5.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (glow > 0) {
    bodyPath();
    ctx.strokeStyle = `rgba(255, 214, 64, ${0.85 * glow})`;
    ctx.lineWidth = 14;
    ctx.stroke();
  }

  bodyPath();
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Brillo y manchas
  ctx.fillStyle = pal.light;
  ctx.globalAlpha = alpha * 0.55;
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.32, r * 0.2, -0.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.arc(r * 0.45, r * 0.4, r * 0.12, 0, TAU);
  ctx.arc(-r * 0.5, r * 0.3, r * 0.09, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha;

  // Cara
  const ink = pal.outline;
  const lx = clamp(lookX, -1, 1) * 2.2;
  const ly = clamp(lookY, -1, 1) * 2.2;
  if (expr === 'dizzy') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k < 18; k++) {
        const a = k * 0.7 + t * 10 * s;
        const rr = 0.4 * k;
        ctx.lineTo(s * 9 + Math.cos(a) * rr, -4 + Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(0, 10, 4, 5, 0, 0, TAU);
    ctx.fill();
  } else {
    for (const s of [-1, 1]) {
      const winking = expr === 'tease' && s === -1;
      if (winking) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(s * 9, -3, 5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(s * 9, -4, 6.8, 7.8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#2A0F2E';
      ctx.beginPath();
      ctx.arc(s * 9 + lx, -3 + ly, 3.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s * 9 + lx - 1.1, -4.4 + ly, 1.2, 0, TAU);
      ctx.fill();
    }
    // Cejas pícaras
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -15);
    ctx.lineTo(-4, -11);
    ctx.moveTo(15, -15);
    ctx.lineTo(4, -11);
    ctx.stroke();

    if (expr === 'tease') {
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 6, 7, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = '#FF7A9A';
      ctx.beginPath();
      ctx.ellipse(2, 13, 4, 5, 0.2, 0, TAU);
      ctx.fill();
    } else {
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 5, 8.5, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(2, 12.6);
      ctx.lineTo(6.5, 11.8);
      ctx.lineTo(4.6, 16.4);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Frasco de Echinacea Médica ─────────────────────────────────────────────

function drawMiniFlower(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.rotate((i / 12) * TAU);
    drawPetal(ctx, 12, 6, COLORS.pink, null, null);
    ctx.restore();
  }
  ctx.fillStyle = COLORS.cone;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** (x, y) = base del frasco; alto aproximado 170 * s */
export function drawBottle(ctx, x, y, s, font) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(30, 40, 30, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 48, 8, 0, 0, TAU);
  ctx.fill();

  // Vidrio ámbar
  const g = ctx.createLinearGradient(-42, 0, 42, 0);
  g.addColorStop(0, '#7A3A0E');
  g.addColorStop(0.35, '#C9752A');
  g.addColorStop(0.6, '#E39A4D');
  g.addColorStop(1, '#8E4614');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#4E2306';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-40, -10);
  ctx.lineTo(-40, -96);
  ctx.quadraticCurveTo(-40, -122, -18, -128);
  ctx.lineTo(-16, -142);
  ctx.lineTo(16, -142);
  ctx.lineTo(18, -128);
  ctx.quadraticCurveTo(40, -122, 40, -96);
  ctx.lineTo(40, -10);
  ctx.quadraticCurveTo(40, 0, 30, 0);
  ctx.lineTo(-30, 0);
  ctx.quadraticCurveTo(-40, 0, -40, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tapa
  ctx.fillStyle = COLORS.green;
  ctx.strokeStyle = COLORS.greenDark;
  ctx.beginPath();
  ctx.roundRect(-21, -170, 42, 32, 7);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = -14; i <= 14; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, -164);
    ctx.lineTo(i, -144);
    ctx.stroke();
  }

  // Etiqueta
  ctx.fillStyle = '#FFFDF8';
  ctx.strokeStyle = '#E6D5C3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-35, -100, 70, 82, 8);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-35, -100, 70, 82, 8);
  ctx.clip();
  ctx.fillStyle = COLORS.pink;
  ctx.fillRect(-35, -100, 70, 14);
  ctx.fillStyle = COLORS.green;
  ctx.fillRect(-35, -26, 70, 8);
  ctx.restore();

  drawMiniFlower(ctx, 0, -68, 0.95);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.pinkDark;
  ctx.font = `800 12.5px ${font}`;
  ctx.fillText('Echinacea', 0, -45);
  ctx.fillStyle = COLORS.greenDark;
  ctx.font = `800 11px ${font}`;
  ctx.fillText('Médica', 0, -33);

  // Reflejo del vidrio
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.roundRect(-36, -118, 6, 104, 3);
  ctx.fill();

  ctx.restore();
}

// ── Escena final: Echi, la persona y el frasco ─────────────────────────────

/** Composición pensada para un lienzo lógico de 340 × 230. */
export function drawFinale(ctx, w, h, t, font) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9ED8F5');
  sky.addColorStop(1, '#F2FAF4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Rayos de sol
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = 'rgba(255, 236, 150, 0.45)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -w);
    ctx.lineTo(18, -w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = '#8DCF7A';
  ctx.beginPath();
  ctx.ellipse(w / 2, h + 40, w * 0.85, 92, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#6DBB5E';
  ctx.beginPath();
  ctx.ellipse(w / 2, h + 62, w * 0.7, 88, 0, 0, TAU);
  ctx.fill();

  const ground = h - 12;
  drawPerson(ctx, {
    x: w * 0.24,
    y: ground,
    t,
    walk: 0,
    walking: 0,
    expr: 'happy',
    weights: [1, 0, 0, 0],
    scale: 0.82,
    wave: 1,
  });
  drawEchi(ctx, {
    x: w * 0.78,
    y: ground,
    t,
    hop: Math.abs(Math.sin(t * 3)) * 6,
    expr: 'happy',
    bloom: 1,
    scale: 0.88,
    wave: 1,
    arms: 0.2,
  });
  drawBottle(ctx, w * 0.5, ground + 2 - Math.sin(t * 2) * 2, 0.78, font);

  // Pétalos que caen
  for (let i = 0; i < 9; i++) {
    const px = ((i * 97 + t * 22) % (w + 40)) - 20;
    const py = ((i * 53 + t * (30 + i * 4)) % (h + 30)) - 15;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(t * 2 + i);
    drawPetal(ctx, 12, 6, i % 2 ? COLORS.pink : COLORS.pinkLight, null, null);
    ctx.restore();
  }
}
