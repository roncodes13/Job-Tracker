import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getApplication,
  listApplications,
} from "../../api/applications.js";
import { ApiError } from "../../api/auth.js";
import { INTERVIEW_TYPES } from "./interviewOptions.js";
import Button from "../../components/Button.jsx";
import FeedbackState from "../../components/FeedbackState.jsx";
import FormField from "../../components/FormField.jsx";

function localDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialValues(interview) {
  return {
    application_id: interview?.application_id ?? "",
    scheduled_at: localDateTimeValue(interview?.scheduled_at),
    interview_type: interview?.interview_type ?? "video",
    meeting_url: interview?.meeting_url ?? "",
    notes: interview?.notes ?? "",
  };
}

export default function InterviewForm({
  interview,
  initialApplicationId = "",
  onSubmit,
  submitLabel,
  cancelTo,
}) {
  const [values, setValues] = useState(() => ({
    ...initialValues(interview),
    application_id: interview?.application_id ?? initialApplicationId,
  }));
  const [applications, setApplications] = useState([]);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [debouncedApplicationSearch, setDebouncedApplicationSearch] =
    useState("");
  const [loadingApplications, setLoadingApplications] = useState(!interview);
  const [applicationError, setApplicationError] = useState("");
  const [applicationRetryKey, setApplicationRetryKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedApplicationSearch(applicationSearch.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [applicationSearch]);

  useEffect(() => {
    if (interview) {
      setLoadingApplications(false);
      return undefined;
    }
    let active = true;
    setLoadingApplications(true);
    setApplicationError("");
    listApplications({
      q: debouncedApplicationSearch,
      page: 1,
      page_size: 100,
      sort_by: "company",
    })
      .then((result) => {
        if (active) setApplications(result.items);
      })
      .catch((error) => {
        if (active) {
          setApplicationError(
            error instanceof ApiError
              ? error.message
              : "We couldn't load your applications.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingApplications(false);
      });

    return () => {
      active = false;
    };
  }, [applicationRetryKey, debouncedApplicationSearch, interview]);

  useEffect(() => {
    if (interview || loadingApplications) return undefined;
    if (!values.application_id || applications.some(
      (application) => application.id === values.application_id,
    )) {
      return;
    }

    let active = true;
    getApplication(values.application_id)
      .then((application) => {
        if (active) {
          setApplications((current) =>
            current.some((item) => item.id === application.id)
              ? current
              : [application, ...current],
          );
        }
      })
      .catch((error) => {
        if (active) {
          setErrors((current) => ({
            ...current,
            application_id:
              error instanceof ApiError
                ? error.message
                : "This application could not be loaded.",
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [applications, values.application_id, interview, loadingApplications]);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!values.application_id) {
      nextErrors.application_id = "Choose a job application.";
    }
    if (!values.scheduled_at) {
      nextErrors.scheduled_at = "Choose an interview date and time.";
    } else if (Number.isNaN(new Date(values.scheduled_at).getTime())) {
      nextErrors.scheduled_at = "Enter a valid date and time.";
    }
    if (values.meeting_url.trim()) {
      try {
        const url = new URL(values.meeting_url.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        nextErrors.meeting_url = "Enter a valid HTTP or HTTPS URL.";
      }
    }
    if (values.notes.length > 10_000) {
      nextErrors.notes = "Notes must be 10,000 characters or fewer.";
    }
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await onSubmit(
        values.application_id,
        {
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          interview_type: values.interview_type,
          meeting_url: values.meeting_url.trim() || null,
          notes: values.notes.trim() || null,
        },
      );
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
      } else {
        setFormError(
          error instanceof ApiError
            ? error.message
            : "We couldn't save this interview. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (applicationError) {
    return (
      <FeedbackState
        actionLabel="Try again"
        description={applicationError}
        onAction={() => setApplicationRetryKey((key) => key + 1)}
        variant="error"
      />
    );
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {formError && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {formError}
        </p>
      )}
      {!interview && (
        <div className="space-y-4">
          <FormField
            autoComplete="organization"
            hint="Search by company or job title."
            label="Find a job application"
            onChange={(event) => setApplicationSearch(event.target.value)}
            placeholder="Search applications"
            type="search"
            value={applicationSearch}
          />
        <FormField
          as="select"
          error={errors.application_id}
          label="Job application"
          name="application_id"
          onChange={updateField}
          required
          value={values.application_id}
        >
          <option value="">
            {loadingApplications
              ? "Loading applications..."
              : applications.length
                ? "Select an application"
                : "No applications found"}
          </option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.company} — {application.job_title}
            </option>
          ))}
        </FormField>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          error={errors.scheduled_at}
          hint="Your local time zone is converted to UTC when saved."
          label="Date and time"
          name="scheduled_at"
          onChange={updateField}
          required
          type="datetime-local"
          value={values.scheduled_at}
        />
        <FormField
          as="select"
          error={errors.interview_type}
          label="Interview type"
          name="interview_type"
          onChange={updateField}
          required
          value={values.interview_type}
        >
          {INTERVIEW_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </FormField>
      </div>
      <FormField
        autoComplete="url"
        error={errors.meeting_url}
        label="Meeting URL"
        maxLength={2048}
        name="meeting_url"
        onChange={updateField}
        placeholder="https://meet.example.com/..."
        type="url"
        value={values.meeting_url}
      />
      <FormField
        as="textarea"
        className="min-h-28 resize-y"
        error={errors.notes}
        label="Notes"
        maxLength={10_000}
        name="notes"
        onChange={updateField}
        placeholder="Topics, people to meet, or preparation notes..."
        value={values.notes}
      />
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button
          as={Link}
          className="w-full sm:w-auto"
          to={cancelTo}
          variant="secondary"
        >
          Cancel
        </Button>
        <Button className="w-full sm:w-auto" disabled={submitting} type="submit">
          {submitting && (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
