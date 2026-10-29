import { APPLICATION_STATUSES } from "../applications/applicationOptions.js";
import Card from "../../components/Card.jsx";
import FeedbackState from "../../components/FeedbackState.jsx";

const colors = {
  saved: "bg-slate-400",
  applied: "bg-blue-500",
  interviewing: "bg-violet-500",
  offer: "bg-emerald-500",
  rejected: "bg-rose-500",
  withdrawn: "bg-amber-500",
};

export default function ApplicationStatusChart({ counts = {} }) {
  const total = Object.values(counts).reduce(
    (sum, count) => sum + Number(count ?? 0),
    0,
  );
  const rows = APPLICATION_STATUSES.map((status) => ({
    ...status,
    count: Number(counts[status.value] ?? 0),
  }));
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Applications by status
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {total} total application{total === 1 ? "" : "s"}
          </p>
        </div>
        <span aria-hidden="true" className="text-xs text-slate-400">
          All time
        </span>
      </div>

      {total === 0 ? (
        <div className="pt-4">
          <FeedbackState
            className="min-h-48 border-0 shadow-none"
            description="Status totals will appear after you add applications."
            title="No application data yet"
          />
        </div>
      ) : (
        <div
          aria-label={`Application status distribution: ${rows.map((row) => `${row.label} ${row.count}`).join(", ")}`}
          className="mt-6 space-y-4"
          role="img"
        >
          {rows.map((row) => (
            <div className="grid grid-cols-[minmax(90px,0.8fr)_minmax(70px,2fr)_2rem] items-center gap-3" key={row.value}>
              <span className="truncate text-xs font-medium text-slate-600">
                {row.label}
              </span>
              <span
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <span
                  className={`block h-full rounded-full ${colors[row.value]}`}
                  style={{ width: `${(row.count / maxCount) * 100}%` }}
                />
              </span>
              <span className="text-right text-xs font-semibold tabular-nums text-slate-700">
                {row.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
