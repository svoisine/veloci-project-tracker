import { useTheme } from '../theme.jsx';

/**
 * Loading placeholders. One pulsing block, plus the two arrangements VPT uses:
 * the dashboard's layout and the hub's card grid.
 *
 * The `vptPulse` keyframes live in index.html — inline styles cannot declare
 * them, and every placeholder in the app shares the one animation.
 */
export function Bar({ height, width = '100%', radius = 10, style }) {
  const { T } = useTheme();
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: T.bg2,
        border: `1px solid ${T.line2}`,
        animation: 'vptPulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

const TOP_ROW = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
  marginBottom: 16,
};

/** The dashboard while its first brief is in flight. */
export function DashboardSkeleton() {
  const { T } = useTheme();
  return (
    <>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.line}` }}>
        <Bar height={40} width={380} />
      </div>
      <div style={TOP_ROW}>
        <Bar height={252} radius={14} />
        <Bar height={252} radius={14} />
        <Bar height={252} radius={14} />
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <Bar height={200} radius={14} />
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <Bar height={200} radius={14} />
        </div>
      </div>
      <Bar height={140} radius={14} />
    </>
  );
}

/** The hub while the project list is in flight. */
export function CardGridSkeleton({ count = 3 }) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Bar key={i} height={148} radius={14} />
      ))}
    </div>
  );
}
