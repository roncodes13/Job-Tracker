import { useEffect, useState } from "react";
import { ApiError } from "../api/auth.js";
import { getAnalyticsSummary } from "../api/analytics.js";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import ApplicationStatusChart from "../features/analytics/ApplicationStatusChart.jsx";
import MonthlyApplicationsChart from "../features/analytics/MonthlyApplicationsChart.jsx";
import { APPLICATION_STATUSES } from "../features/applications/applicationOptions.js";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAnalyticsSummary()
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load analytics. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-indigo-600">Workspace</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
          Analytics
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          A clear view of your applications and progress over time.
        </p>
      </header>

      {error ? (
        <FeedbackState
          actionLabel="Try again"
          description={error}
          onAction={() => setRefreshKey((key) => key + 1)}
          variant="error"
        />
      ) : loading ? (
        <FeedbackState variant="loading" />
      ) : summary ? (
        <>
          <section aria-label="Application status totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {APPLICATION_STATUSES.map((status) => (
              <Card className="flex items-center justify-between p-5" key={status.value}>
                <span className="text-sm font-medium text-slate-600">
                  {status.label}
                </span>
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {summary.applications_by_status[status.value] ?? 0}
                </span>
              </Card>
            ))}
          </section>
          <section className="grid gap-5 xl:grid-cols-2">
            <ApplicationStatusChart counts={summary.applications_by_status} />
            <MonthlyApplicationsChart months={summary.monthly_applications} />
          </section>
        </>
      ) : null}
    </div>
  );
}
