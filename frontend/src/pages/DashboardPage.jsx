import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { getAnalyticsSummary } from "../api/analytics.js";
import { listApplications } from "../api/applications.js";
import { ApiError } from "../api/auth.js";
import { listInterviews } from "../api/interviews.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import Icon from "../components/Icon.jsx";
import ApplicationStatusChart from "../features/analytics/ApplicationStatusChart.jsx";
import MonthlyApplicationsChart from "../features/analytics/MonthlyApplicationsChart.jsx";
import {
  formatInterviewDate,
  interviewTypeLabel,
} from "../features/interviews/interviewOptions.js";

const summaryCards = [
  {
    key: "total_applications",
    label: "Applications",
    icon: "briefcase",
    color: "bg-indigo-50 text-indigo-600",
    detail: "Tracked in your workspace",
  },
  {
    key: "interviews_scheduled",
    label: "Upcoming interviews",
    icon: "calendar",
    color: "bg-emerald-50 text-emerald-600",
    detail: "Scheduled from now on",
  },
  {
    key: "offers_received",
    label: "Offers",
    icon: "sparkle",
    color: "bg-amber-50 text-amber-600",
    detail: "Applications with an offer",
  },
  {
    key: "rejections",
    label: "Rejections",
    icon: "close",
    color: "bg-rose-50 text-rose-600",
    detail: "Applications marked rejected",
  },
];

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [applicationById, setApplicationById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [interviewsError, setInterviewsError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSummaryError("");
    setInterviewsError("");
    const now = new Date().toISOString();

    Promise.allSettled([
      getAnalyticsSummary(),
      listInterviews({ scheduledFrom: now }),
      listApplications({ page: 1, page_size: 100, sort_by: "company" }),
    ])
      .then(([summaryResult, interviewsResult, applicationsResult]) => {
        if (!active) return;
        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value);
        } else {
          setSummaryError(
            summaryResult.reason instanceof ApiError
              ? summaryResult.reason.message
              : "We couldn't load your analytics summary.",
          );
        }
        if (interviewsResult.status === "fulfilled") {
          setUpcomingInterviews(interviewsResult.value.items.slice(0, 5));
        } else {
          setInterviewsError(
            interviewsResult.reason instanceof ApiError
              ? interviewsResult.reason.message
              : "We couldn't load upcoming interviews.",
          );
        }
        if (applicationsResult.status === "fulfilled") {
          setApplicationById(
            new Map(
              applicationsResult.value.items.map((item) => [item.id, item]),
            ),
          );
        } else {
          setApplicationById(new Map());
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const cards = useMemo(
    () =>
      summaryCards.map((card) => ({
        ...card,
        value: summary?.[card.key] ?? 0,
      })),
    [summary],
  );

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-indigo-600">
            {formattedDate}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
            Your dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
            Keep your job search moving, one step at a time.
          </p>
        </div>
        <Button as={Link} to="/app/applications/new">
          <Icon name="plus" size={18} />
          New application
        </Button>
      </section>

      {summaryError && (
        <FeedbackState
          actionLabel="Try again"
          description={summaryError}
          onAction={() => setRefreshKey((key) => key + 1)}
          variant="error"
        />
      )}

      {loading ? (
        <section aria-label="Workspace overview">
          <FeedbackState className="min-h-40" variant="loading" />
        </section>
      ) : !summaryError && summary ? (
        <>
          <section
            aria-label="Workspace overview"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {cards.map((item) => (
              <Card className="p-5 sm:p-6" key={item.key}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                      {item.value}
                    </p>
                  </div>
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <Icon name={item.icon} size={19} />
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">{item.detail}</p>
              </Card>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ApplicationStatusChart counts={summary.applications_by_status} />
            <MonthlyApplicationsChart months={summary.monthly_applications} />
          </section>
        </>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Upcoming interviews
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Your next scheduled conversations
            </p>
          </div>
          <Button
            as={Link}
            className="shrink-0"
            size="sm"
            to="/app/interviews"
            variant="ghost"
          >
            View all
            <Icon name="chevron" size={14} />
          </Button>
        </div>
        {interviewsError ? (
          <FeedbackState
            actionLabel="Try again"
            className="border-0 shadow-none"
            description={interviewsError}
            onAction={() => setRefreshKey((key) => key + 1)}
            variant="error"
          />
        ) : loading ? (
          <FeedbackState className="min-h-48 border-0 shadow-none" variant="loading" />
        ) : upcomingInterviews.length === 0 ? (
          <FeedbackState
            className="border-0 shadow-none"
            description="When you schedule an interview, it will show up here."
            title="Nothing scheduled yet"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingInterviews.map((interview) => {
              const application = applicationById.get(interview.application_id);
              return (
                <li
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  key={interview.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon name="calendar" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {application
                          ? `${application.company} — ${application.job_title}`
                          : `Application ${interview.application_id.slice(0, 8)}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatInterviewDate(interview.scheduled_at)} ·{" "}
                        {interviewTypeLabel(interview.interview_type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
                    {interview.meeting_url && (
                      <a
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        href={interview.meeting_url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Meeting link
                      </a>
                    )}
                    <Button
                      as={Link}
                      size="sm"
                      to={`/app/interviews/${interview.id}/edit`}
                      variant="secondary"
                    >
                      View
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && !interviewsError && upcomingInterviews.length > 0 && (
          <p aria-live="polite" className="sr-only" role="status">
            {upcomingInterviews.length} upcoming interviews displayed.
          </p>
        )}
      </Card>
    </div>
  );
}
