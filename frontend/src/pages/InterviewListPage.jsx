import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { listApplications } from "../api/applications.js";
import { ApiError } from "../api/auth.js";
import { listInterviews } from "../api/interviews.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import {
  formatInterviewDate,
  interviewTypeLabel,
} from "../features/interviews/interviewOptions.js";

function dateBound(value, endOfDay = false) {
  if (!value) return undefined;
  if (!isValidCalendarDate(value)) return undefined;
  const localDate = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`,
  );
  return localDate.toISOString();
}

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function InterviewListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const invalidDate =
    (dateFrom && !isValidCalendarDate(dateFrom)) ||
    (dateTo && !isValidCalendarDate(dateTo));
  const invalidDateRange =
    !invalidDate && Boolean(dateFrom && dateTo) && dateFrom > dateTo;
  const queryString = searchParams.toString();
  const [interviews, setInterviews] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [success, setSuccess] = useState(location.state?.success ?? "");

  useEffect(() => {
    let active = true;
    if (invalidDate || invalidDateRange) {
      setLoading(false);
      setError(
        invalidDateRange
          ? "The start date must be on or before the end date."
          : "Enter valid calendar dates in the interview date filters.",
      );
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError("");

    Promise.all([
      listInterviews({
        scheduledFrom: dateBound(dateFrom),
        scheduledTo: dateBound(dateTo, true),
      }),
      listApplications({ page: 1, page_size: 100, sort_by: "company" }),
    ])
      .then(([interviewResult, applicationResult]) => {
        if (!active) return;
        setInterviews(interviewResult.items);
        setApplications(applicationResult.items);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load your interviews. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [invalidDateRange, queryString, refreshKey]);

  function updateDate(name, value) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next);
  }

  function dismissSuccess() {
    setSuccess("");
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }

  const applicationById = useMemo(
    () => new Map(applications.map((application) => [application.id, application])),
    [applications],
  );
  const currentTime = Date.now();

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-600">Workspace</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
            Interviews
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Keep your upcoming conversations and preparation in view.
          </p>
        </div>
        <Button as={Link} to="/app/interviews/new">
          <Icon name="plus" size={18} />
          Schedule interview
        </Button>
      </header>

      {success && (
        <div
          className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          <span>{success}</span>
          <button
            aria-label="Dismiss success message"
            className="rounded p-0.5 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
            onClick={dismissSuccess}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            hint="Uses your local time zone for the selected calendar date."
            label="From date"
            name="from"
            onChange={(event) => updateDate("from", event.target.value)}
            type="date"
            value={dateFrom}
          />
          <FormField
            label="Through date"
            name="to"
            onChange={(event) => updateDate("to", event.target.value)}
            type="date"
            value={dateTo}
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            className="mt-4"
            onClick={() => setSearchParams(new URLSearchParams())}
            size="sm"
            variant="ghost"
          >
            Clear date filters
          </Button>
        )}
      </Card>

      {error ? (
        <FeedbackState
          actionLabel="Try again"
          description={error}
          onAction={() => setRefreshKey((key) => key + 1)}
          variant="error"
        />
      ) : loading ? (
        <FeedbackState variant="loading" />
      ) : interviews.length === 0 ? (
        <FeedbackState
          actionLabel={
            dateFrom || dateTo ? "Clear date filters" : "Schedule an interview"
          }
          description={
            dateFrom || dateTo
              ? "No interviews were found in this date range."
              : "Interviews you schedule will appear here, ready for your next step."
          }
          onAction={() =>
            dateFrom || dateTo
              ? setSearchParams(new URLSearchParams())
              : navigate("/app/interviews/new")
          }
          title={dateFrom || dateTo ? "No matching interviews" : "No interviews yet"}
        />
      ) : (
        <section aria-label="Interview schedule" className="space-y-3">
          {interviews.map((interview) => {
            const application = applicationById.get(interview.application_id);
            const isUpcoming = new Date(interview.scheduled_at).getTime() >= currentTime;
            return (
              <Card
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                key={interview.id}
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isUpcoming ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}
                  >
                    <Icon name="calendar" size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {formatInterviewDate(interview.scheduled_at)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {interviewTypeLabel(interview.interview_type)} interview
                      {isUpcoming ? (
                        <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Upcoming
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Past
                        </span>
                      )}
                    </p>
                    <Link
                      className="mt-1 inline-block max-w-full truncate text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      to={`/app/applications/${interview.application_id}`}
                    >
                      {application
                        ? `${application.company} — ${application.job_title}`
                        : `Application ${interview.application_id.slice(0, 8)}`}
                    </Link>
                    {interview.meeting_url && (
                      <a
                        className="mt-1 block max-w-full truncate text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-indigo-600"
                        href={interview.meeting_url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Open meeting link
                      </a>
                    )}
                    {interview.notes && (
                      <p className="mt-1 max-w-prose truncate text-xs text-slate-500">
                        {interview.notes}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  as={Link}
                  className="shrink-0 self-start sm:self-center"
                  size="sm"
                  to={`/app/interviews/${interview.id}/edit`}
                  variant="secondary"
                >
                  Edit interview
                </Button>
              </Card>
            );
          })}
        </section>
      )}
      {!loading && !error && interviews.length > 0 && (
        <p aria-live="polite" className="sr-only" role="status">
          {interviews.length} interviews loaded.
        </p>
      )}
    </div>
  );
}
