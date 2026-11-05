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

// `warm`: tono de la mitad de abajo del cuerpo. `iris`: color de los ojos.
export const CREATURE_PALETTES = [
  // nublado
  { body: '#A45BDB', light: '#DDB8F7', dark: '#6F31A6', outline: '#3B1361', knob: '#FF8FB0', warm: '#C8326F', iris: '#FFD23F' },
  // lluvia
  { body: '#2FB3C6', light: '#A3ECF2', dark: '#1B7C99', outline: '#0D3B52', knob: '#FFD45C', warm: '#2265B8', iris: '#FFB13B' },
  // nieve
  { body: '#7F93F2', light: '#D6DEFF', dark: '#5160C9', outline: '#222A6E', knob: '#DFF8FF', warm: '#7A4BD6', iris: '#FFE45C' },
];

export const GOLDEN_PALETTE = {
  body: '#FFCC2E', light: '#FFF6BA', dark: '#DE9A00', outline: '#6B3F00', knob: '#FF7FA6', warm: '#F07A00', iris: '#E5407F',
};
export const VELOZ_PALETTE = {
  body: '#FF8A3D', light: '#FFD0A8', dark: '#D9531C', outline: '#5C1A05', knob: '#FFE066', warm: '#E0302A', iris: '#FFE45C',
};

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

export function mixRgb(rgbList, weights) {
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
  return [r, g, b];
}

// Color CSS de un [r, g, b]; `k` > 0 lo aclara hacia el blanco y `k` < 0 lo oscurece.
export function rgbStr(rgb, k = 0) {
  const f = (c) => (k >= 0 ? c + (255 - c) * k : c * (1 + k)) | 0;
  return `rgb(${f(rgb[0])},${f(rgb[1])},${f(rgb[2])})`;
}

export function mixColors(rgbList, weights) {
  return rgbStr(mixRgb(rgbList, weights));
}

// ── Formas base ────────────────────────────────────────────────────────────

// La luz viene de arriba a la izquierda: brillos a la izquierda, sombras abajo a la derecha.

// Sombra difusa en el suelo: da sensación de volumen mejor que una mancha plana.
export function softShadow(ctx, x, y, rx, ry, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(25, 45, 25, ${alpha})`);
  g.addColorStop(0.55, `rgba(25, 45, 25, ${alpha * 0.7})`);
  g.addColorStop(1, 'rgba(25, 45, 25, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Degradado a lo largo de un pétalo (de la base, en 0, a la punta, en -len). Un solo degradado
// sirve para todos los pétalos de una flor porque se aplica con la rotación de cada uno.
export function petalGradient(ctx, len, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

const PETAL_FRONT = [
  [0, '#B3185A'],
  [0.6, '#E5407F'],
  [1, '#FF9CC2'],
];
const PETAL_BACK = [
  [0, '#7E0C3E'],
  [0.6, '#B31F5C'],
  [1, '#D9437F'],
];

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

  softShadow(ctx, 2, 2, 31 - hop * 0.7, 7.5 - hop * 0.14, 0.3);

  ctx.translate(0, -hop);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Hojas (pies y brazos) con luz arriba y sombra abajo.
  const leafFill = ctx.createLinearGradient(0, -7, 0, 7);
  leafFill.addColorStop(0, '#9BE6B1');
  leafFill.addColorStop(0.5, COLORS.greenLight);
  leafFill.addColorStop(1, COLORS.green);

  // Pies: dos hojitas que se alternan al caminar.
  const step = Math.sin(walk);
  for (const s of [-1, 1]) {
    const lift = Math.max(0, step * s) * 4;
    ctx.save();
    ctx.translate(s * 9, -3 - lift);
    ctx.fillStyle = leafFill;
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
  const stem = (dx) => {
    ctx.beginPath();
    ctx.moveTo(dx, -6);
    ctx.quadraticCurveTo(sway + dx, -40, sway * 0.5 + dx, headY + 24);
  };
  stem(0);
  ctx.strokeStyle = COLORS.greenDark;
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 6.5;
  ctx.stroke();
  stem(-1.6);
  ctx.strokeStyle = '#86DDA0';
  ctx.lineWidth = 2.2;
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
    ctx.fillStyle = leafFill;
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
  // Fila de atrás, más oscura y entre los pétalos de delante: le da volumen a la flor.
  const back = petalGradient(ctx, 52, PETAL_BACK);
  for (let i = 0; i < petals; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / petals) * TAU + Math.sin(t * 2 + i + 1) * 0.03;
    const len = 42 + 8 * Math.max(0, Math.sin(a)) + arms * 4;
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    drawPetal(ctx, len, 17, back, null, null);
    ctx.restore();
  }
  const front = petalGradient(ctx, 56, PETAL_FRONT);
  for (let i = 0; i < petals; i++) {
    const a = -Math.PI / 2 + (i / petals) * TAU + Math.sin(t * 2 + i) * 0.03;
    // Los pétalos de la equinácea caen hacia abajo: los inferiores son más largos.
    const len = 46 + 9 * Math.max(0, Math.sin(a)) + arms * 4;
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    drawPetal(ctx, len, 19, front, COLORS.pinkDark, 'rgba(255, 190, 215, 0.7)');
    ctx.restore();
  }

  // Sombra que el cono proyecta sobre los pétalos
  const ao = ctx.createRadialGradient(2, 3, 29, 2, 3, 43);
  ao.addColorStop(0, 'rgba(100, 8, 45, 0.4)');
  ao.addColorStop(1, 'rgba(100, 8, 45, 0)');
  ctx.fillStyle = ao;
  ctx.beginPath();
  ctx.arc(2, 3, 43, 0, TAU);
  ctx.fill();

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
  ctx.fillStyle = 'rgba(255, 242, 205, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-13, -20, 7.5, 3.4, -0.55, 0, TAU);
  ctx.fill();

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
const SKIN_LIGHT = '#FFE4D0';
const SKIN_SHADE = '#E2A27C';
const SKIN_LINE = '#C98A66';
const HAIR = '#4A2F23';
const HAIR_LIGHT = '#7C5242';
const PANTS = '#3B4A7A';
const PANTS_LIGHT = '#5A6DA6';
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
  const coatRgb = mixRgb(COAT, weights);
  const coat = rgbStr(coatRgb);
  const coatLight = rgbStr(coatRgb, 0.28);
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

  softShadow(ctx, 6, 2, 40, 8.5, 0.32);

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

  // `light`: franja de brillo del lado iluminado, para que se vea redondeado.
  const limb = (fromX, fromY, ang, len, width, color, light) => {
    const ex = fromX + Math.sin(ang) * len;
    const ey = fromY + Math.cos(ang) * len;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (light) {
      const ox = -Math.cos(ang) * width * 0.2;
      const oy = Math.sin(ang) * width * 0.2;
      ctx.strokeStyle = light;
      ctx.lineWidth = width * 0.34;
      ctx.beginPath();
      ctx.moveTo(fromX + ox, fromY + oy);
      ctx.lineTo(ex + ox, ey + oy);
      ctx.stroke();
    }
    return [ex, ey];
  };

  // Brazo de atrás
  const [bhx, bhy] = limb(shoulder.x - 4, shoulder.y, backArm, 42, 13, coatDark);
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.arc(bhx, bhy, 7, 0, TAU);
  ctx.fill();

  // Piernas
  const legs = [
    [-sw * 0.5, PANTS_BACK, -4, null],
    [sw * 0.5, PANTS, 5, PANTS_LIGHT],
  ];
  for (const [ang, color, dx, light] of legs) {
    const [fx, fy] = limb(dx, hipY, ang, 50, 15, color, light);
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
  const torso = ctx.createLinearGradient(-23, 0, 23, 0);
  torso.addColorStop(0, coatLight);
  torso.addColorStop(0.45, coat);
  torso.addColorStop(1, rgbStr(coatRgb, -0.16));
  ctx.fillStyle = torso;
  ctx.strokeStyle = coatDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-23, -126 + bob, 46, 74, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.ellipse(-10, -114 + bob, 9, 5, -0.3, 0, TAU);
  ctx.fill();
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

  const face = ctx.createRadialGradient(hx + 2, hy - 12, 4, hx, hy, 35);
  face.addColorStop(0, SKIN_LIGHT);
  face.addColorStop(0.55, SKIN);
  face.addColorStop(1, SKIN_SHADE);
  ctx.fillStyle = face;
  ctx.strokeStyle = SKIN_LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, 33, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Pelo
  const hair = ctx.createRadialGradient(hx - 14, hy - 26, 2, hx - 4, hy - 8, 42);
  hair.addColorStop(0, HAIR_LIGHT);
  hair.addColorStop(1, HAIR);
  ctx.fillStyle = hair;
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
  ctx.strokeStyle = 'rgba(255, 235, 220, 0.28)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(hx, hy, 29, Math.PI * 1.18, Math.PI * 1.45);
  ctx.stroke();

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
  const [fhx, fhy] = limb(shoulder.x + 6, shoulder.y, frontArm, 42, 13, coat, coatLight);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(fhx, fhy, 7.5, 0, TAU);
  ctx.fill();

  ctx.restore();
}

// ── Criaturas ──────────────────────────────────────────────────────────────

// Dirección de la luz (arriba a la izquierda), en radianes.
const LIGHT = -2.2;
// Espículas alrededor del cuerpo; abajo quedan libres para las patitas.
const SPIKE_ANGLES = [-90, -45, 0, 45, 135, 180, -135].map((d) => (d * Math.PI) / 180);

function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * opciones: x, y, r, t, pal, expr ('grin'|'dizzy'|'tease'), lookX, lookY, rot, scale, alpha, glow,
 * pointy (espículas en punta en lugar de trompetas)
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

  // La luz se pasa a las coordenadas de la criatura para que no gire con ella.
  const la = LIGHT - rot;
  const ldx = Math.cos(la);
  const ldy = Math.sin(la);

  const bodyPath = () => {
    ctx.beginPath();
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + 0.035 * Math.sin(a * 5 + t * 6));
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  };

  // Patitas que patalean en el aire (detrás del cuerpo)
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 2.2;
  for (const s of [-1, 1]) {
    const fx = s * 8.5;
    const fy = r + 1 + Math.sin(t * 9 + (s > 0 ? Math.PI : 0)) * 2;
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 5.6, 5.2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba(pal.light, 0.55);
    ctx.beginPath();
    ctx.ellipse(fx - 1.6, fy - 0.6, 1.9, 1.3, 0, 0, TAU);
    ctx.fill();
  }

  // Espículas. El lado del tallo que mira a la luz va más claro.
  const stalkUp = ctx.createLinearGradient(0, -5, 0, 5);
  const stalkDown = ctx.createLinearGradient(0, 5, 0, -5);
  for (const g of [stalkUp, stalkDown]) {
    g.addColorStop(0, pal.light);
    g.addColorStop(0.45, pal.body);
    g.addColorStop(1, pal.dark);
  }
  for (let j = 0; j < SPIKE_ANGLES.length; j++) {
    const a = SPIKE_ANGLES[j] + Math.sin(t * 3 + j) * 0.1;
    const lit = Math.cos(a - Math.PI / 2 - la) > 0 ? -1 : 1; // -1: la luz da en el lado -y
    const base = r * 0.78;
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = pal.outline;
    if (pointy) {
      // Veloz: conos en punta, con una mitad iluminada
      const tip = r + 15;
      ctx.beginPath();
      ctx.moveTo(base, -6);
      ctx.lineTo(tip, 0);
      ctx.lineTo(base, 6);
      ctx.closePath();
      ctx.fillStyle = pal.knob;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(base, 6 * lit);
      ctx.lineTo(tip - 2, 0);
      ctx.lineTo(base, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Tallo que se afina y termina en una trompeta con su disco de color
      const tip = r + 12 + Math.sin(t * 4 + j * 1.7) * 1.2;
      const mid = (base + tip) / 2;
      ctx.beginPath();
      ctx.moveTo(base, -5.5);
      ctx.quadraticCurveTo(mid, -2, tip, -2.6);
      ctx.lineTo(tip, 2.6);
      ctx.quadraticCurveTo(mid, 2, base, 5.5);
      ctx.closePath();
      ctx.fillStyle = lit < 0 ? stalkUp : stalkDown;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = pal.dark;
      ctx.beginPath();
      ctx.ellipse(tip, 0, 3.4, 7, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pal.knob;
      ctx.beginPath();
      ctx.ellipse(tip + 0.9, 0, 2.2, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.ellipse(tip + 1.2, 2.2 * lit, 0.9, 1.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  if (glow > 0) {
    bodyPath();
    ctx.strokeStyle = `rgba(255, 214, 64, ${0.85 * glow})`;
    ctx.lineWidth = 14;
    ctx.stroke();
  }

  // Cuerpo: esfera iluminada arriba a la izquierda, con la mitad de abajo de otro tono
  bodyPath();
  const body = ctx.createRadialGradient(ldx * r * 0.45, ldy * r * 0.45, r * 0.06, 0, 0, r * 1.08);
  body.addColorStop(0, pal.light);
  body.addColorStop(0.42, pal.body);
  body.addColorStop(1, pal.dark);
  ctx.fillStyle = body;
  ctx.fill();
  const warm = ctx.createLinearGradient(0, -r * 0.15, 0, r);
  warm.addColorStop(0, rgba(pal.warm, 0));
  warm.addColorStop(1, rgba(pal.warm, 0.7));
  ctx.fillStyle = warm;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Sombra propia: media luna del lado contrario a la luz
  const sx = ldx * r * 0.2;
  const sy = ldy * r * 0.2;
  ctx.beginPath();
  ctx.rect(-r * 2, -r * 2, r * 4, r * 4);
  ctx.moveTo(sx + r * 0.97, sy);
  ctx.arc(sx, sy, r * 0.97, 0, TAU);
  ctx.fillStyle = rgba(pal.outline, 0.3);
  ctx.fill('evenodd');
  // Luz rebotada en el borde de la sombra
  ctx.strokeStyle = rgba(pal.light, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, la + Math.PI - 0.8, la + Math.PI + 0.8);
  ctx.stroke();
  ctx.restore();

  // Manchitas: claras arriba, oscuras abajo
  ctx.fillStyle = rgba(pal.light, 0.6);
  ctx.beginPath();
  ctx.arc(6, -19, 2.2, 0, TAU);
  ctx.moveTo(13.5, -14);
  ctx.arc(12, -14, 1.5, 0, TAU);
  ctx.moveTo(-0.6, -21.5);
  ctx.arc(-2, -21.5, 1.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(pal.outline, 0.22);
  ctx.beginPath();
  ctx.arc(15, 12, 2.6, 0, TAU);
  ctx.moveTo(-13, 14);
  ctx.arc(-15, 14, 2, 0, TAU);
  ctx.fill();

  bodyPath();
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // Reflejo especular
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(ldx * r * 0.68, ldy * r * 0.68, r * 0.2, r * 0.1, la + Math.PI / 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(ldx * r * 0.78 + ldy * 4, ldy * r * 0.78 - ldx * 4, 1.6, 0, TAU);
  ctx.fill();

  // Cara
  const ink = pal.outline;
  const lx = clamp(lookX, -1, 1) * 2;
  const ly = clamp(lookY, -1, 1) * 2;
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
      const ex = s * 9;
      const ey = -3;
      if (expr === 'tease' && s === -1) {
        // Guiño
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(ex, ey, 5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        continue;
      }
      // Ojo con el párpado más bajo hacia el centro de la cara: mirada pícara.
      // `ex - s * 9` es el lado de adentro del ojo y `ex + s * 9` el de afuera.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ex - s * 9, ey - 3.5);
      ctx.lineTo(ex + s * 9, ey - 8.5);
      ctx.lineTo(ex + s * 9, ey + 10);
      ctx.lineTo(ex - s * 9, ey + 10);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 6.8, 7.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pal.iris;
      ctx.beginPath();
      ctx.arc(ex + lx, ey + 1 + ly, 4.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(pal.outline, 0.45);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#1E0B24';
      ctx.beginPath();
      ctx.arc(ex + lx * 1.2, ey + 1 + ly * 1.2, 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex + lx - 1.6, ey - 0.4 + ly, 1.3, 0, TAU);
      ctx.moveTo(ex + lx + 2.1, ey + 2.8 + ly);
      ctx.arc(ex + lx + 1.4, ey + 2.8 + ly, 0.7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 6.8, 7.6, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - s * 7.8, ey - 3.8);
      ctx.lineTo(ex + s * 7.6, ey - 8);
      ctx.stroke();
    }

    ctx.strokeStyle = ink;
    if (expr === 'tease') {
      // Boca abierta con la lengua afuera
      ctx.fillStyle = '#3A0F2A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, 7);
      ctx.quadraticCurveTo(0, 18, 7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FF7A9A';
      ctx.beginPath();
      ctx.ellipse(1.8, 12.6, 3.4, 2.8, 0.2, 0, TAU);
      ctx.fill();
    } else {
      // Sonrisa ladeada con un colmillo
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-7, 8.5);
      ctx.quadraticCurveTo(0, 15, 7.5, 7.5);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(1.5, 11.3);
      ctx.lineTo(5.2, 9.4);
      ctx.lineTo(3.8, 14.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
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

// ── Marca junto al camino: carteles y frasco gigante ───────────────────────

// Colores del envase de Echinacea Médica.
const BRAND = {
  magenta: '#F03D93',
  magentaDark: '#A80F5B',
  yellow: '#FFE11B',
  blue: '#2F86C2',
  blueDark: '#17598F',
  shadow: '#6E0739',
};

/** Cartel en unidades lógicas. `photo`: alto de la foto del producto, que sobresale por arriba. */
export const BILLBOARD = { w: 206, h: 110, border: 4, post: 54, photo: 124 };
/** Margen transparente alrededor de la foto del producto, para su sombra. */
export const SPRITE_PAD = 8;
/** Frasco gigante: alto del frasco y medidas del pedestal. */
export const BOTTLE_STAND = { bottle: 118, radius: 36, height: 20 };

/**
 * Dibujo fijo (textos, fotos) hecho una sola vez en un lienzo aparte, para no repetirlo en cada
 * cuadro. Se dibuja a `scale`× para que se vea nítido. Devuelve { img, w, h } en unidades lógicas.
 */
export function makeSprite(w, h, draw, scale = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = 'high';
  draw(ctx, scale);
  return { img: canvas, w, h };
}

// Achica la fuente lo necesario para que `text` quepa en `maxW`.
function fitFont(ctx, text, weight, size, maxW, font) {
  ctx.font = `${weight} ${size}px ${font}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size *= maxW / w;
    ctx.font = `${weight} ${size}px ${font}`;
  }
  return size;
}

function quad(ctx, a, b, c, d) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.closePath();
  ctx.fill();
}

/**
 * Cara del cartel (w × h) con los colores del envase: el nombre en amarillo sobre magenta,
 * «100% natural» sobre azul y el distribuidor abajo. La foto del producto se dibuja aparte, a la
 * derecha, así que los textos van en la columna izquierda.
 */
export function drawBillboardFace(ctx, w, h, font, logo) {
  const col = w * 0.56;
  const cx = col / 2 + 3;
  const band = h * 0.55;
  const strip = 19;

  const blue = ctx.createLinearGradient(0, band, 0, h);
  blue.addColorStop(0, BRAND.blue);
  blue.addColorStop(1, BRAND.blueDark);
  ctx.fillStyle = blue;
  ctx.fillRect(0, 0, w, h);
  const magenta = ctx.createLinearGradient(0, 0, 0, band);
  magenta.addColorStop(0, BRAND.magenta);
  magenta.addColorStop(1, BRAND.magentaDark);
  ctx.fillStyle = magenta;
  ctx.fillRect(0, 0, w, band);
  ctx.fillStyle = BRAND.yellow;
  ctx.fillRect(0, band, w, 2.5);

  // Nombre en dos líneas, con relieve
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, 'Echinacea', 800, 25, col - 12, font);
  const y1 = band * 0.33;
  const y2 = y1 + size * 0.95;
  const nameWidth = ctx.measureText('Médica').width;
  for (const [text, y] of [
    ['Echinacea', y1],
    ['Médica', y2],
  ]) {
    ctx.fillStyle = BRAND.shadow;
    ctx.fillText(text, cx, y + 2);
    ctx.fillStyle = BRAND.yellow;
    ctx.fillText(text, cx, y);
  }
  ctx.font = `700 ${size * 0.4}px ${font}`;
  ctx.fillText('®', cx + nameWidth / 2 + size * 0.24, y2 - size * 0.24);

  ctx.fillStyle = '#FFFFFF';
  fitFont(ctx, '100% natural', 800, 13, col - 14, font);
  ctx.fillText('100% natural', cx, (band + 2.5 + h - strip) / 2 + 1);

  // Franja del distribuidor
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, h - strip, w, strip);
  ctx.font = `700 8.5px ${font}`;
  const label = 'Distribuido por';
  const lw = ctx.measureText(label).width;
  const logoH = 11;
  const logoW = logo ? (logoH * logo.naturalWidth) / logo.naturalHeight : 24;
  const x0 = cx - (lw + 5 + logoW) / 2;
  const sy = h - strip / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND.magentaDark;
  ctx.fillText(label, x0, sy + 0.5);
  if (logo) {
    ctx.drawImage(logo, x0 + lw + 5, sy - logoH / 2, logoW, logoH);
  } else {
    ctx.font = `800 11px ${font}`;
    ctx.fillStyle = '#1D2F6F';
    ctx.fillText('INTI', x0 + lw + 5, sy + 0.5);
  }

  // Sombra del marco y reflejo de vidrio
  const inner = ctx.createLinearGradient(0, 0, 0, 7);
  inner.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
  inner.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, w, 7);
  const gloss = ctx.createLinearGradient(0, 0, w * 0.45, h);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0.07)');
  gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Cartel sobre dos postes. (x, y) = pie del cartel en el suelo. `face` y `photo` son sprites de
 * makeSprite (la foto falta mientras carga). `side` (-1..1): el cartel muestra su canto hacia el
 * centro de la pantalla, así al pasar se ve como un objeto con grosor.
 */
export function drawBillboard(ctx, o) {
  const { x, y, t = 0, face, photo, snow = 0, side = 0 } = o;
  const { w, h, border, post } = BILLBOARD;
  const L = x - w / 2;
  const R = x + w / 2;
  const B = y - post;
  const T = B - h;
  const dx = side * 10;
  const dy = -5;

  softShadow(ctx, x + 8, y + 1, w * 0.52, 9, 0.28);

  // Postes de madera (cilindros), en el plano de atrás
  for (const px of [x - w * 0.27 + dx, x + w * 0.27 + dx]) {
    const g = ctx.createLinearGradient(px - 5.5, 0, px + 5.5, 0);
    g.addColorStop(0, '#B07E50');
    g.addColorStop(0.35, '#D6A672');
    g.addColorStop(1, '#5E3D22');
    ctx.fillStyle = g;
    ctx.fillRect(px - 5.5, B - 6, 11, y - B + 7);
    ctx.fillStyle = 'rgba(30, 15, 5, 0.3)';
    ctx.fillRect(px - 5.5, B, 11, 7);
  }

  // Grosor: cara superior y canto
  ctx.fillStyle = '#E4EAF2';
  quad(ctx, [L, T], [L + dx, T + dy], [R + dx, T + dy], [R, T]);
  ctx.fillStyle = '#8A97A8';
  const edge = dx > 0 ? R : L;
  quad(ctx, [edge, T], [edge + dx, T + dy], [edge + dx, B + dy], [edge, B]);

  // Marco y cara
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(L, T, w, h);
  ctx.fillStyle = 'rgba(40, 50, 70, 0.18)';
  ctx.fillRect(L, B - 2, w, 2);
  const fx = L + border;
  const fy = T + border;
  const fw = w - border * 2;
  const fh = h - border * 2;
  if (face) ctx.drawImage(face.img, fx, fy, fw, fh);

  // Destello que recorre el cartel cada pocos segundos
  const k = (t % 6) / 1.3;
  if (k < 1) {
    const sx = fx - 60 + k * (fw + 120);
    const g = ctx.createLinearGradient(sx - 30, fy, sx + 30, fy + fh);
    g.addColorStop(0, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(fx, fy, fw, fh);
  }

  if (snow > 0.02) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * snow})`;
    ctx.beginPath();
    ctx.roundRect(Math.min(L, L + dx) - 3, T + dy - 5, w + Math.abs(dx) + 6, 9, 4.5);
    ctx.fill();
  }

  // Foto del producto, que sobresale del cartel
  if (photo) {
    ctx.drawImage(
      photo.img,
      R - border - 2 - photo.w + SPRITE_PAD,
      B - border - photo.h + SPRITE_PAD,
      photo.w,
      photo.h
    );
  }
}

/**
 * Frasco gigante que flota sobre un pedestal con una cinta de la marca. (x, y) = pie del pedestal.
 * `bottle`: sprite del frasco recortado de la foto; sin él se usa el frasco ilustrado.
 */
export function drawBottleDisplay(ctx, o) {
  const { x, y, t = 0, bottle, font, snow = 0 } = o;
  const { radius: R, height: H } = BOTTLE_STAND;
  const ry = R * 0.3;
  const yb = y - ry; // centro de la elipse de abajo
  const yt = yb - H; // centro de la elipse de arriba
  const float = 5 + Math.sin(t * 2) * 2.5;
  const bh = bottle ? bottle.h : 133;
  const by = yt - float; // base del frasco
  const cy = by - bh * 0.5;

  ctx.save();
  softShadow(ctx, x + 6, y, R * 1.45, 9, 0.3);

  // Resplandor y rayos detrás del frasco
  const glow = ctx.createRadialGradient(x, cy, 8, x, cy, 92);
  glow.addColorStop(0, 'rgba(255, 246, 196, 0.8)');
  glow.addColorStop(1, 'rgba(255, 246, 196, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, cy, 92, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(t * 0.3);
  const rays = ctx.createRadialGradient(0, 0, 20, 0, 0, 96);
  rays.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  rays.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rays;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.09) * 96, Math.sin(a - 0.09) * 96);
    ctx.lineTo(Math.cos(a + 0.09) * 96, Math.sin(a + 0.09) * 96);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();

  // Pedestal: cilindro magenta con borde dorado
  const sideFill = ctx.createLinearGradient(x - R, 0, x + R, 0);
  sideFill.addColorStop(0, '#F25FA3');
  sideFill.addColorStop(0.3, '#FF9AC6');
  sideFill.addColorStop(1, '#9A0B50');
  ctx.fillStyle = sideFill;
  ctx.beginPath();
  ctx.moveTo(x - R, yt);
  ctx.lineTo(x - R, yb);
  ctx.ellipse(x, yb, R, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x + R, yt);
  ctx.closePath();
  ctx.fill();
  const topFill = ctx.createLinearGradient(0, yt - ry, 0, yt + ry);
  topFill.addColorStop(0, '#FFE6F1');
  topFill.addColorStop(1, '#FFB3D3');
  ctx.fillStyle = topFill;
  ctx.beginPath();
  ctx.ellipse(x, yt, R, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (snow > 0.02) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * snow})`;
    ctx.beginPath();
    ctx.ellipse(x, yt, R - 3, ry - 2, 0, 0, TAU);
    ctx.fill();
  }

  // Sombra del frasco sobre el pedestal: más chica cuanto más alto flota
  ctx.fillStyle = `rgba(120, 10, 60, ${0.4 - float * 0.03})`;
  ctx.beginPath();
  ctx.ellipse(x + 2, yt, 21 - float, 5.5 - float * 0.25, 0, 0, TAU);
  ctx.fill();

  if (bottle) ctx.drawImage(bottle.img, x - bottle.w / 2, by - bottle.h, bottle.w, bottle.h);
  else drawBottle(ctx, x, by, 0.78, font);

  // Destellos alrededor
  ctx.fillStyle = '#FFF6C8';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1;
    const a = 1 - Math.abs(k * 2 - 1);
    ctx.globalAlpha = a;
    drawSparkle(ctx, x + [-36, 33, -27][i], by - [96, 64, 30][i], 4 + 5 * a, t);
  }
  ctx.globalAlpha = 1;

  // Cinta con el nombre, curvada sobre el pedestal
  const rw = 144;
  const rh = 21;
  const ry0 = (yt + yb) / 2 + 3;
  const rl = x - rw / 2;
  ctx.fillStyle = '#8A0A49';
  for (const s of [-1, 1]) {
    const ex = x + s * (rw / 2 - 4);
    ctx.beginPath();
    ctx.moveTo(ex, ry0 - rh / 2 + 5);
    ctx.lineTo(ex + s * 18, ry0 - rh / 2 + 5);
    ctx.lineTo(ex + s * 12, ry0 + 5);
    ctx.lineTo(ex + s * 18, ry0 + rh / 2 + 5);
    ctx.lineTo(ex, ry0 + rh / 2 + 5);
    ctx.closePath();
    ctx.fill();
  }
  const ribbon = ctx.createLinearGradient(0, ry0 - rh / 2, 0, ry0 + rh / 2);
  ribbon.addColorStop(0, BRAND.magenta);
  ribbon.addColorStop(1, '#B3105F');
  ctx.fillStyle = ribbon;
  ctx.beginPath();
  ctx.moveTo(rl, ry0 - rh / 2);
  ctx.quadraticCurveTo(x, ry0 - rh / 2 + 7, rl + rw, ry0 - rh / 2);
  ctx.lineTo(rl + rw, ry0 + rh / 2);
  ctx.quadraticCurveTo(x, ry0 + rh / 2 + 7, rl, ry0 + rh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'Echinacea Médica', 800, 15, rw - 18, font);
  ctx.fillStyle = BRAND.shadow;
  ctx.fillText('Echinacea Médica', x, ry0 + 4.8);
  ctx.fillStyle = BRAND.yellow;
  ctx.fillText('Echinacea Médica', x, ry0 + 3.4);
  ctx.restore();
}

// ── Imágenes para el lienzo ────────────────────────────────────────────────

const imageCache = new Map();

/** Carga (una sola vez) una imagen para dibujarla en canvas; devuelve null hasta que esté lista. */
export function loadImage(src) {
  if (!src || typeof Image === 'undefined') return null;
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

// ── Escena final: Echi, la persona y el frasco ─────────────────────────────

/**
 * Composición pensada para un lienzo lógico de 340 × 250.
 * `productSrc`: URL de la foto real del producto; sin ella se dibuja el frasco ilustrado.
 */
export function drawFinale(ctx, w, h, t, font, productSrc = null) {
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
  // Con la foto del producto, el frasco y la caja son lo más grande y los personajes lo
  // acompañan a los costados.
  drawPerson(ctx, {
    x: productSrc ? w * 0.15 : w * 0.24,
    y: ground,
    t,
    walk: 0,
    walking: 0,
    expr: 'happy',
    weights: [1, 0, 0, 0],
    scale: productSrc ? 0.76 : 0.82,
    wave: 1,
  });
  drawEchi(ctx, {
    x: productSrc ? w * 0.865 : w * 0.78,
    y: ground,
    t,
    hop: Math.abs(Math.sin(t * 3)) * 6,
    expr: 'happy',
    bloom: 1,
    scale: productSrc ? 0.78 : 0.88,
    wave: 1,
    arms: 0.2,
  });
  if (productSrc) {
    const img = loadImage(productSrc);
    if (img) {
      const ph = h * 0.84;
      const pw = (ph * img.naturalWidth) / img.naturalHeight;
      const bob = Math.sin(t * 2) * 2;
      ctx.fillStyle = 'rgba(30, 50, 30, 0.2)';
      ctx.beginPath();
      ctx.ellipse(w / 2, ground + 3, pw * 0.48, 7, 0, 0, TAU);
      ctx.fill();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, w / 2 - pw / 2, ground + 4 - ph - bob, pw, ph);
    }
  } else {
    drawBottle(ctx, w * 0.5, ground + 2 - Math.sin(t * 2) * 2, 0.78, font);
  }

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
