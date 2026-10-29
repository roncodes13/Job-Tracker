import Card from "../../components/Card.jsx";
import FeedbackState from "../../components/FeedbackState.jsx";

function monthLabel(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

export default function MonthlyApplicationsChart({ months = [] }) {
  const maxCount = Math.max(...months.map((item) => item.count), 0);
  const allEmpty = months.length === 0 || maxCount === 0;
  const points = months.map((item, index) => {
    const x = months.length <= 1 ? 250 : 28 + (index * 444) / (months.length - 1);
    const y = 132 - (maxCount ? (item.count / maxCount) * 102 : 0);
    return { ...item, x, y };
  });
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <Card className="p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Application trend
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Applications created per month · last 6 months
        </p>
      </div>
      {allEmpty ? (
        <div className="pt-4">
          <FeedbackState
            className="min-h-48 border-0 shadow-none"
            description="The monthly trend will appear as you add applications."
            title="No monthly activity yet"
          />
        </div>
      ) : (
        <div className="mt-5">
          <svg
            aria-label={`Monthly applications: ${months.map((item) => `${monthLabel(item.month)} ${item.count}`).join(", ")}`}
            className="h-52 w-full overflow-visible"
            role="img"
            viewBox="0 0 500 180"
          >
            <title>Monthly application trend</title>
            <desc>
              {months
                .map((item) => `${monthLabel(item.month)}: ${item.count}`)
                .join("; ")}
            </desc>
            {[30, 81, 132].map((y) => (
              <line
                key={y}
                stroke="#e2e8f0"
                strokeDasharray="3 5"
                x1="20"
                x2="480"
                y1={y}
                y2={y}
              />
            ))}
            <polygon
              fill="url(#monthlyTrendFill)"
              points={`28,132 ${polyline} 472,132`}
            />
            <defs>
              <linearGradient id="monthlyTrendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              points={polyline}
              stroke="#4f46e5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {points.map((point) => (
              <g key={point.month}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="white"
                  r="4.5"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                />
                <text
                  fill="#475569"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  x={point.x}
                  y="163"
                >
                  {monthLabel(point.month)}
                </text>
                <text
                  fill="#334155"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                  x={point.x}
                  y={Math.max(point.y - 12, 16)}
                >
                  {point.count}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </Card>
  );
}
