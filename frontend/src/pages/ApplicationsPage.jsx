import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { ApiError } from "../api/auth.js";
import { listApplications } from "../api/applications.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  statusLabel,
} from "../features/applications/applicationOptions.js";
import StatusBadge from "../features/applications/StatusBadge.jsx";

function formatDate(value) {
  if (!value) return "Not applied";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatSalary(minimum, maximum) {
  const amount = (value) =>
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(Number(value));
  if (minimum != null && maximum != null) {
    return `${amount(minimum)} – ${amount(maximum)}`;
  }
  if (minimum != null) return `${amount(minimum)}+`;
  if (maximum != null) return `Up to ${amount(maximum)}`;
  return "Not specified";
}

export default function ApplicationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  });
  const [searchDraft, setSearchDraft] = useState(searchParams.get("q") ?? "");
  const status = searchParams.get("status") ?? "";
  const employmentType = searchParams.get("employment_type") ?? "";
  const sortBy =
    searchParams.get("sort_by") === "company" ? "company" : "applied_at";
  const sortOrder =
    searchParams.get("sort_order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const queryString = searchParams.toString();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(location.state?.success ?? "");
  const searchTimer = useRef(null);

  function cancelPendingSearch() {
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  }

  useEffect(() => {
    cancelPendingSearch();
    setSearchDraft(new URLSearchParams(queryString).get("q") ?? "");
  }, [queryString]);

  useEffect(
    () => {
      function syncSearchFromHistory() {
        cancelPendingSearch();
        setSearchDraft(
          new URLSearchParams(window.location.search).get("q") ?? "",
        );
      }

      window.addEventListener("popstate", syncSearchFromHistory);
      return () => {
        window.removeEventListener("popstate", syncSearchFromHistory);
        cancelPendingSearch();
      };
    },
    [],
  );

  function updateSearch(value) {
    setSearchDraft(value);
    cancelPendingSearch();
    searchTimer.current = window.setTimeout(() => {
      searchTimer.current = null;
      const next = new URLSearchParams(window.location.search);
      const query = value.trim();
      if (query) next.set("q", query);
      else next.delete("q");
      next.delete("page");
      if (next.toString() !== new URLSearchParams(window.location.search).toString()) {
        setSearchParams(next, { replace: true });
      }
    }, 250);
  }

  function updateQuery(name, value, { resetPage = true } = {}) {
    cancelPendingSearch();
    const next = new URLSearchParams(window.location.search);
    const draft = searchDraft.trim();
    if (draft) next.set("q", draft);
    else next.delete("q");
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage && name !== "page") next.delete("page");
    setSearchParams(next);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    listApplications({
      q: searchParams.get("q") ?? "",
      status,
      employment_type: employmentType,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: 20,
    })
      .then((result) => {
        if (!active) return;
        setApplications(result.items);
        setPagination(result);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load your applications. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryString, refreshKey]);

  function clearFilters() {
    cancelPendingSearch();
    setSearchDraft("");
    setSearchParams(new URLSearchParams());
  }

  const hasFilters = Boolean(
    searchDraft ||
      status ||
      employmentType ||
      sortBy !== "applied_at" ||
      sortOrder !== "desc",
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-600">Workspace</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
            Applications
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Keep the details and next steps for every opportunity together.
          </p>
        </div>
        <Button as={Link} to="/app/applications/new">
          <Icon name="plus" size={18} />
          Add application
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
            className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
            onClick={() => setSuccess("")}
            type="button"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))]">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
            <Icon name="search" size={17} />
            <span className="sr-only">Search company or job title</span>
            <input
              aria-label="Search company or job title"
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search company or role"
              type="search"
              value={searchDraft}
            />
          </label>
          <FormField
            aria-label="Filter by status"
            as="select"
            className="min-h-11"
            label="Status"
            onChange={(event) => updateQuery("status", event.target.value)}
            value={status}
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </FormField>
          <FormField
            aria-label="Filter by employment type"
            as="select"
            className="min-h-11"
            label="Employment type"
            onChange={(event) =>
              updateQuery("employment_type", event.target.value)
            }
            value={employmentType}
          >
            <option value="">All types</option>
            {EMPLOYMENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </FormField>
          <FormField
            aria-label="Sort applications by"
            as="select"
            className="min-h-11"
            label="Sort by"
            onChange={(event) => updateQuery("sort_by", event.target.value, {
              resetPage: false,
            })}
            value={sortBy}
          >
            <option value="applied_at">Application date</option>
            <option value="company">Company</option>
          </FormField>
          <FormField
            aria-label="Sort order"
            as="select"
            className="min-h-11"
            label="Order"
            onChange={(event) => updateQuery("sort_order", event.target.value, {
              resetPage: false,
            })}
            value={sortOrder}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </FormField>
        </div>
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
      ) : applications.length === 0 ? (
        <Card className="p-4 sm:p-6">
          <FeedbackState
            actionLabel={hasFilters ? "Clear filters" : "Add an application"}
            description={
              hasFilters
                ? "No applications match these filters. Try broadening your search."
                : "Add your first opportunity to keep its details and next steps in one place."
            }
            onAction={
              hasFilters
                ? clearFilters
                : () => navigate("/app/applications/new")
            }
            title={hasFilters ? "No matching applications" : "Nothing here yet"}
          />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5" scope="col">Company / role</th>
                    <th className="px-4 py-3.5" scope="col">Status</th>
                    <th className="px-4 py-3.5" scope="col">Applied</th>
                    <th className="px-4 py-3.5" scope="col">Location</th>
                    <th className="px-4 py-3.5" scope="col">Salary</th>
                    <th className="px-6 py-3.5" scope="col">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((application) => (
                    <tr className="transition hover:bg-slate-50/70" key={application.id}>
                      <td className="px-6 py-4">
                        <Link
                          className="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                          to={`/app/applications/${application.id}`}
                        >
                          <span className="block font-semibold text-slate-900">
                            {application.company}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {application.job_title}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={application.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDate(application.applied_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {application.location || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatSalary(application.salary_min, application.salary_max)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          aria-label={`View ${application.company} application`}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                          to={`/app/applications/${application.id}`}
                        >
                          <Icon name="chevron" size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {applications.map((application) => (
              <Card className="p-4" key={application.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                      to={`/app/applications/${application.id}`}
                    >
                      <span className="block truncate font-semibold text-slate-900">
                        {application.company}
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-500">
                        {application.job_title}
                      </span>
                    </Link>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                  <div>
                    <p className="text-slate-400">Applied</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {formatDate(application.applied_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Location</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {application.location || "Not specified"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400">Salary range</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {formatSalary(application.salary_min, application.salary_max)}
                    </p>
                  </div>
                  <Link
                    className="col-span-2 inline-flex items-center gap-1 font-semibold text-indigo-600"
                    to={`/app/applications/${application.id}`}
                  >
                    View details <Icon name="chevron" size={14} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {(page - 1) * pagination.page_size + 1}–
                {(page - 1) * pagination.page_size + applications.length}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() =>
                  updateQuery("page", String(Math.max(1, page - 1)), {
                    resetPage: false,
                  })
                }
                size="sm"
                variant="secondary"
              >
                <Icon name="arrowLeft" size={16} />
                Previous
              </Button>
              <span aria-live="polite" className="px-2 text-xs">
                {page} / {Math.max(pagination.total_pages, 1)}
              </span>
              <Button
                aria-label="Next page"
                disabled={page >= pagination.total_pages}
                onClick={() =>
                  updateQuery("page", String(page + 1), { resetPage: false })
                }
                size="sm"
                variant="secondary"
              >
                Next
                <Icon className="rotate-180" name="arrowLeft" size={16} />
              </Button>
            </div>
          </div>
        </>
      )}
      {!loading && !error && applications.length > 0 && (
        <p className="sr-only" role="status">
          {applications.length} applications loaded. Status filter:{" "}
          {status ? statusLabel(status) : "all statuses"}.
        </p>
      )}
    </div>
  );
}
