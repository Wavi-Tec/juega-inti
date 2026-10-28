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

export function CloseIcon() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
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

const CREATURE_COLORS = {
  comun: { body: '#A45BDB', knob: '#FF7FA6', line: '#3B1361' },
  veloz: { body: '#FF8A3D', knob: '#FFE066', line: '#5C1A05' },
  dorado: { body: '#FFCC2E', knob: '#FF7FA6', line: '#6B3F00' },
};

// variant: 'comun' | 'veloz' (espinas en punta) | 'dorado' (con corona)
export function CreatureIcon({ variant = 'comun' }) {
  const c = CREATURE_COLORS[variant];
  const spikes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg {...base} viewBox="-12 -13 24 25" strokeWidth={1.6}>
      {spikes.map((a) =>
        variant === 'veloz' ? (
          <path key={a} d="M-2 -5.6L0 -10.6L2 -5.6z" fill={c.knob} stroke={c.line} transform={`rotate(${a})`} />
        ) : (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 -6v-3.4" stroke={c.line} strokeWidth={2.2} />
            <circle cy="-9.8" r="1.8" fill={c.knob} stroke={c.line} />
          </g>
        )
      )}
      <circle r="6.6" fill={c.body} stroke={c.line} />
      <circle cx="-2.4" cy="-1" r="1.5" fill="#fff" stroke="none" />
      <circle cx="2.4" cy="-1" r="1.5" fill="#fff" stroke="none" />
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
