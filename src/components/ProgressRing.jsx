import { useTheme } from '../theme.jsx';
import { FONT_DISPLAY, FONT_BODY, GRADIENT_FROM, GRADIENT_TO } from '../tokens.js';
import { card, eyebrow } from '../styles.js';

const SIZE = 148;
const STROKE = 11;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export default function ProgressRing({ done = 0, total = 0, pct = 0 }) {
  const { T } = useTheme();
  // Coerced here as well as in App: React throws outright on an object child,
  // so the figure must never be handed a value straight from the wire.
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const safeDone = num(done);
  const safeTotal = num(total);
  const safePct = Math.max(0, Math.min(100, num(pct)));
  const offset = CIRC * (1 - safePct / 100);

  return (
    <section
      style={{
        ...card(T),
        padding: '18px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ ...eyebrow(T), alignSelf: 'flex-start' }}>Progress</div>

      <div style={{ position: 'relative', width: SIZE, height: SIZE, marginTop: 4 }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="vptRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={GRADIENT_FROM} />
              <stop offset="100%" stopColor={GRADIENT_TO} />
            </linearGradient>
          </defs>

          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={T.track} strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="url(#vptRingGrad)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1,
              color: T.text,
              letterSpacing: '.01em',
            }}
          >
            {safeDone}/{safeTotal}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.done }}>
            {safePct}%
          </div>
        </div>
      </div>

      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.text3, marginTop: 12 }}>
        steps complete
      </div>
    </section>
  );
}
