const CHART_WIDTH = 800
const CHART_HEIGHT = 280
const PAD = 28

const formatTime = (date) =>
  new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)

export default function GlucoseChart({ points }) {
  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-white/15 bg-slate-900/65 p-5 text-sm text-slate-300 shadow-glass">
        Für den Verlauf werden mindestens zwei Messwerte benötigt.
      </div>
    )
  }

  const values = points.map((p) => p.value)
  const maxValue = Math.max(...values, 220)
  const minValue = Math.min(...values, 60)
  const spread = Math.max(maxValue - minValue, 20)

  const x = (idx) =>
    PAD + (idx / (points.length - 1)) * (CHART_WIDTH - PAD * 2)

  const y = (value) =>
    CHART_HEIGHT - PAD - ((value - minValue) / spread) * (CHART_HEIGHT - PAD * 2)

  const polyline = points
    .map((point, idx) => `${x(idx).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(' ')

  const topRange = y(180)
  const bottomRange = y(70)
  const first = points[0]
  const middle = points[Math.floor(points.length / 2)]
  const last = points.at(-1)

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/65 p-5 shadow-glass">
      <h2 className="text-lg font-semibold text-white">Letzte Werte</h2>
      <p className="mb-4 text-sm text-slate-300">Visualisierung der letzten {points.length} Einträge</p>

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full">
        <defs>
          <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#66B3FF" />
            <stop offset="100%" stopColor="#48D597" />
          </linearGradient>
          <linearGradient id="rangeFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(72, 213, 151, 0.25)" />
            <stop offset="100%" stopColor="rgba(72, 213, 151, 0.05)" />
          </linearGradient>
        </defs>

        <rect
          x={PAD}
          y={Math.min(topRange, bottomRange)}
          width={CHART_WIDTH - PAD * 2}
          height={Math.abs(bottomRange - topRange)}
          fill="url(#rangeFill)"
        />

        {[70, 120, 180].map((line) => (
          <g key={line}>
            <line
              x1={PAD}
              x2={CHART_WIDTH - PAD}
              y1={y(line)}
              y2={y(line)}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeDasharray="5 5"
              strokeWidth="1"
            />
            <text x={6} y={y(line) + 4} fontSize="12" fill="rgba(148, 163, 184, 0.9)">
              {line}
            </text>
          </g>
        ))}

        <polyline
          fill="none"
          points={polyline}
          stroke="url(#lineGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx={x(points.length - 1)} cy={y(last.value)} r="6" fill="#48D597" />
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <span>{formatTime(first.time)}</span>
        <span>{formatTime(middle.time)}</span>
        <span>{formatTime(last.time)}</span>
      </div>
    </div>
  )
}
