import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/auth.js";
import {
  deleteApplication,
  getApplication,
} from "../api/applications.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import Icon from "../components/Icon.jsx";
import Modal from "../components/Modal.jsx";
import StatusBadge from "../features/applications/StatusBadge.jsx";

function displayDate(value) {
  if (!value) return "Not applied yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function salaryRange(minimum, maximum) {
  const format = (amount) =>
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(Number(amount));
  if (minimum != null && maximum != null) {
    return `${format(minimum)} – ${format(maximum)}`;
  }
  if (minimum != null) return `${format(minimum)}+`;
  if (maximum != null) return `Up to ${format(maximum)}`;
  return "Not specified";
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-slate-800">
        {children || "Not specified"}
      </dd>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getApplication(applicationId)
      .then((result) => {
        if (active) setApplication(result);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load this application.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId]);

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteApplication(applicationId);
      navigate("/app/applications", {
        replace: true,
        state: { success: "Application deleted successfully." },
      });
    } catch (requestError) {
      setDeleteError(
        requestError instanceof ApiError
          ? requestError.message
          : "We couldn't delete this application. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
        to="/app/applications"
      >
        <Icon name="arrowLeft" size={16} />
        All applications
      </Link>

      {loading ? (
        <FeedbackState variant="loading" />
      ) : error ? (
        <FeedbackState
          actionLabel="Back to applications"
          description={error}
          onAction={() => navigate("/app/applications")}
          variant="error"
        />
      ) : application ? (
        <>
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
                  {application.company}
                </h1>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-2 text-base text-slate-600">
                {application.job_title}
              </p>
              {application.location && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <Icon name="mapPin" size={15} />
                  {application.location}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                as={Link}
                to={`/app/interviews/new?application_id=${application.id}`}
                variant="secondary"
              >
                <Icon name="calendar" size={17} />
                Schedule interview
              </Button>
              <Button
                as={Link}
                to={`/app/applications/${application.id}/edit`}
                variant="secondary"
              >
                <Icon name="settings" size={17} />
                Edit
              </Button>
              <Button onClick={() => setDeleteOpen(true)} variant="danger">
                <Icon name="close" size={17} />
                Delete
              </Button>
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
            <Card className="p-5 sm:p-7">
              <h2 className="text-base font-semibold text-slate-900">
                Application details
              </h2>
              <dl className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2">
                <Detail label="Employment type">
                  {application.employment_type}
                </Detail>
                <Detail label="Application date">
                  {displayDate(application.applied_at)}
                </Detail>
                <Detail label="Salary range">
                  {salaryRange(application.salary_min, application.salary_max)}
                </Detail>
                <Detail label="Job posting">
                  {application.job_url ? (
                    <a
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                      href={application.job_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open job posting <Icon name="chevron" size={14} />
                    </a>
                  ) : null}
                </Detail>
              </dl>
            </Card>

            <Card className="p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name="activity" size={17} />
                </span>
                <h2 className="text-base font-semibold text-slate-900">Notes</h2>
              </div>
              {application.notes ? (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {application.notes}
                </p>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-500">
                  No notes yet. Add interview prep or follow-up details when you
                  edit this application.
                </p>
              )}
            </Card>
          </div>
        </>
      ) : null}

      <Modal
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteError("");
          }
        }}
        open={deleteOpen}
        title="Delete this application?"
      >
        <p className="text-sm leading-6 text-slate-600">
          This will permanently delete the application for{" "}
          <span className="font-semibold text-slate-900">
            {application?.job_title} at {application?.company}
          </span>
          . Any interviews associated with it will also be deleted. This action
          cannot be undone.
        </p>
        {deleteError && (
          <p
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {deleteError}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={deleting}
            onClick={() => setDeleteOpen(false)}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            disabled={deleting}
            onClick={confirmDelete}
            variant="danger"
          >
            {deleting && (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {deleting ? "Deleting..." : "Delete application"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
