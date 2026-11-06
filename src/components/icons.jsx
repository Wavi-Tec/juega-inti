// Iconos SVG en línea (heredan el color con currentColor).

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function PlayIcon() {
  return (
    <svg {...base}>
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg {...base}>
      <path d="M9 5.5v13M15 5.5v13" strokeWidth={3.2} />
    </svg>
  );
}

export function SoundOnIcon() {
  return (
    <svg {...base}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

export function SoundOffIcon() {
  return (
    <svg {...base}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );
}

export function FlowerIcon() {
  const petals = Array.from({ length: 10 }, (_, i) => i * 36);
  return (
    <svg {...base} stroke="none" viewBox="-12 -12 24 24">
      {petals.map((a) => (
        <ellipse key={a} cx="0" cy="-6.6" rx="2.3" ry="4.6" fill="#E5407F" transform={`rotate(${a})`} />
      ))}
      <circle r="3.6" fill="#F08A2C" />
    </svg>
  );
}

// Mismos colores que las criaturas del juego (src/game/art.js).
const CREATURE_COLORS = {
  comun: { body: '#A45BDB', light: '#DDB8F7', dark: '#6F31A6', warm: '#C8326F', knob: '#FF8FB0', line: '#3B1361', iris: '#FFD23F' },
  veloz: { body: '#FF8A3D', light: '#FFD0A8', dark: '#D9531C', warm: '#E0302A', knob: '#FFE066', line: '#5C1A05', iris: '#FFE45C' },
  dorado: { body: '#FFCC2E', light: '#FFF6BA', dark: '#DE9A00', warm: '#F07A00', knob: '#FF7FA6', line: '#6B3F00', iris: '#E5407F' },
};
// Ángulos de las espículas (0 = arriba); abajo quedan las patitas.
const CREATURE_SPIKES = [0, 45, 90, 135, 225, 270, 315];

// variant: 'comun' | 'veloz' (espinas en punta) | 'dorado' (con corona)
export function CreatureIcon({ variant = 'comun' }) {
  const c = CREATURE_COLORS[variant];
  const fill = `virus-${variant}`;
  return (
    <svg {...base} viewBox="-12 -13 24 25" strokeWidth={1.4}>
      <defs>
        <radialGradient id={fill} cx="0.34" cy="0.3" r="0.78">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.45" stopColor={c.body} />
          <stop offset="1" stopColor={c.warm} />
        </radialGradient>
      </defs>
      {[-1, 1].map((s) => (
        <ellipse key={s} cx={s * 2.4} cy="6.8" rx="1.7" ry="1.6" fill={c.body} stroke={c.line} strokeWidth={1} />
      ))}
      {CREATURE_SPIKES.map((a) =>
        variant === 'veloz' ? (
          <path key={a} d="M-2 -5.6L0 -10.6L2 -5.6z" fill={c.knob} stroke={c.line} transform={`rotate(${a})`} />
        ) : (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 -6v-3" stroke={c.line} strokeWidth={2.2} />
            <ellipse cy="-9.5" rx="2.3" ry="1.2" fill={c.knob} stroke={c.line} strokeWidth={1.1} />
          </g>
        )
      )}
      <circle r="6.6" fill={`url(#${fill})`} stroke={c.line} />
      <ellipse cx="-3" cy="-3.9" rx="1.7" ry="0.9" fill="#fff" opacity="0.6" stroke="none" transform="rotate(-38 -3 -3.9)" />
      {[-1, 1].map((s) => (
        <g key={s} stroke="none">
          <circle cx={s * 2.4} cy="-0.6" r="1.7" fill="#fff" />
          <circle cx={s * 2.4} cy="-0.3" r="1" fill={c.iris} />
          <circle cx={s * 2.4} cy="-0.3" r="0.5" fill="#1E0B24" />
        </g>
      ))}
      <path d="M-4.3 -2.4L-1 -1.4M4.3 -2.4L1 -1.4" stroke={c.line} strokeWidth={1.1} />
      <path d="M-2.4 2.4q2.4 1.8 4.8 0" stroke={c.line} />
      {variant === 'dorado' && (
        <path d="M-4 -7.4l-.8-4 2.4 1.6L0 -12.6l2.4 2.8 2.4-1.6-.8 4z" fill="#FFD23F" stroke={c.line} strokeWidth={1.1} />
      )}
    </svg>
  );
}

export function RingIcon() {
  return (
    <svg {...base} viewBox="-12 -12 24 24" strokeWidth={2.2}>
      <circle r="10" stroke="#FFD23F" strokeDasharray="3 2.4" />
      <circle r="6.2" stroke="#FFD23F" strokeWidth={3} />
      <path d="M0 -2.6l.8 1.8 1.8.8-1.8.8L0 2.6l-.8-1.8-1.8-.8 1.8-.8z" fill="#FFD23F" stroke="none" />
    </svg>
  );
}

export function PetalShieldIcon() {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg {...base} viewBox="-12 -12 24 24" stroke="none">
      {petals.map((a) => (
        <path
          key={a}
          d="M0 -4.5c2 -1.4 2.6 -4.4 0 -7c-2.6 2.6 -2 5.6 0 7z"
          fill="currentColor"
          transform={`rotate(${a})`}
        />
      ))}
      <circle r="3.4" fill="#FFC067" />
    </svg>
  );
}
