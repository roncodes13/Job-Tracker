import { useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../../api/auth.js";
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
} from "./applicationOptions.js";
import Button from "../../components/Button.jsx";
import FormField from "../../components/FormField.jsx";

function applicationToForm(application) {
  return {
    company: application?.company ?? "",
    job_title: application?.job_title ?? "",
    job_url: application?.job_url ?? "",
    location: application?.location ?? "",
    employment_type: application?.employment_type ?? "",
    salary_min: application?.salary_min ?? "",
    salary_max: application?.salary_max ?? "",
    applied_at: application?.applied_at ?? "",
    status: application?.status ?? "saved",
    notes: application?.notes ?? "",
  };
}

function validate(values) {
  const errors = {};
  if (!values.company.trim()) errors.company = "Enter a company name.";
  if (!values.job_title.trim()) errors.job_title = "Enter a job title.";

  if (values.job_url.trim()) {
    try {
      const url = new URL(values.job_url.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      errors.job_url = "Enter a valid HTTP or HTTPS URL.";
    }
  }

  for (const field of ["salary_min", "salary_max"]) {
    const value = values[field].trim();
    if (value && (!/^\d{1,10}(\.\d{1,2})?$/.test(value) || Number(value) < 0)) {
      errors[field] = "Enter a non-negative amount with up to 2 decimals.";
    }
  }
  if (
    !errors.salary_min &&
    !errors.salary_max &&
    values.salary_min &&
    values.salary_max &&
    Number(values.salary_min) > Number(values.salary_max)
  ) {
    errors.salary_min = "Minimum salary cannot exceed maximum salary.";
    errors.salary_max = "Maximum salary must be at least the minimum.";
  }

  if (values.applied_at && !/^\d{4}-\d{2}-\d{2}$/.test(values.applied_at)) {
    errors.applied_at = "Enter a valid date.";
  }
  if (values.notes.length > 10_000) {
    errors.notes = "Notes must be 10,000 characters or fewer.";
  }
  return errors;
}

function toPayload(values) {
  return {
    company: values.company.trim(),
    job_title: values.job_title.trim(),
    job_url: values.job_url.trim() || null,
    location: values.location.trim() || null,
    employment_type: values.employment_type.trim() || null,
    salary_min: values.salary_min.trim() || null,
    salary_max: values.salary_max.trim() || null,
    applied_at: values.applied_at || null,
    status: values.status,
    notes: values.notes.trim() || null,
  };
}

export default function ApplicationForm({
  application,
  onSubmit,
  submitLabel,
  onCancelTo,
}) {
  const [values, setValues] = useState(() => applicationToForm(application));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await onSubmit(toPayload(values));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
      } else {
        setFormError(
          error instanceof ApiError
            ? error.message
            : "We couldn't save this application. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      {formError && (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {formError}
        </p>
      )}

      <section aria-labelledby="application-role-heading">
        <h2
          className="mb-4 text-sm font-semibold text-slate-900"
          id="application-role-heading"
        >
          Role details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            autoComplete="organization"
            error={errors.company}
            label="Company"
            maxLength={200}
            name="company"
            onChange={updateField}
            required
            value={values.company}
          />
          <FormField
            autoComplete="organization-title"
            error={errors.job_title}
            label="Job title"
            maxLength={200}
            name="job_title"
            onChange={updateField}
            required
            value={values.job_title}
          />
          <FormField
            autoComplete="url"
            error={errors.job_url}
            hint="Include the full https:// address."
            label="Job posting URL"
            maxLength={2048}
            name="job_url"
            onChange={updateField}
            placeholder="https://company.com/careers/role"
            type="url"
            value={values.job_url}
          />
          <FormField
            autoComplete="address-level2"
            error={errors.location}
            label="Location"
            maxLength={200}
            name="location"
            onChange={updateField}
            placeholder="City, region or remote"
            value={values.location}
          />
          <FormField
            as="select"
            error={errors.employment_type}
            label="Employment type"
            name="employment_type"
            onChange={updateField}
            value={values.employment_type}
          >
            <option value="">Select a type</option>
            {values.employment_type &&
              !EMPLOYMENT_TYPES.includes(values.employment_type) && (
                <option value={values.employment_type}>
                  {values.employment_type}
                </option>
              )}
            {EMPLOYMENT_TYPES.map((employmentType) => (
              <option key={employmentType} value={employmentType}>
                {employmentType}
              </option>
            ))}
          </FormField>
          <FormField
            as="select"
            error={errors.status}
            label="Status"
            name="status"
            onChange={updateField}
            required
            value={values.status}
          >
            {APPLICATION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </FormField>
        </div>
      </section>

      <section aria-labelledby="application-details-heading">
        <h2
          className="mb-4 text-sm font-semibold text-slate-900"
          id="application-details-heading"
        >
          Application details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            error={errors.salary_min}
            label="Minimum salary"
            min="0"
            name="salary_min"
            onChange={updateField}
            placeholder="e.g. 80000"
            step="0.01"
            type="number"
            value={values.salary_min}
          />
          <FormField
            error={errors.salary_max}
            label="Maximum salary"
            min="0"
            name="salary_max"
            onChange={updateField}
            placeholder="e.g. 110000"
            step="0.01"
            type="number"
            value={values.salary_max}
          />
          <FormField
            error={errors.applied_at}
            hint="Leave blank if you haven't applied yet."
            label="Application date"
            name="applied_at"
            onChange={updateField}
            type="date"
            value={values.applied_at}
          />
        </div>
        <div className="mt-4">
          <FormField
            as="textarea"
            className="min-h-32 resize-y"
            error={errors.notes}
            hint={`${values.notes.length.toLocaleString()} / 10,000 characters`}
            label="Notes"
            maxLength={10_000}
            name="notes"
            onChange={updateField}
            placeholder="Add a few notes to help you prepare..."
            value={values.notes}
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button
          as={Link}
          className="w-full sm:w-auto"
          to={onCancelTo}
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
      {submitting && (
        <p aria-live="polite" className="sr-only">
          Saving application
        </p>
      )}
    </form>
  );
}
