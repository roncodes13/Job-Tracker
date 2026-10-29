const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const ACCESS_TOKEN_KEY = "jobtrack_access_token";
const inFlightGetRequests = new Map();
const VALIDATION_FIELDS = new Set([
  "name",
  "email",
  "password",
  "company",
  "job_title",
  "job_url",
  "location",
  "employment_type",
  "salary_min",
  "salary_max",
  "status",
  "applied_at",
  "notes",
  "application_id",
  "scheduled_at",
  "interview_type",
  "meeting_url",
]);

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function validationFieldErrors(details) {
  if (!Array.isArray(details)) return {};

  return details.reduce((errors, item) => {
    const field = item.location?.at(-1);
    if (
      typeof field === "string" &&
      VALIDATION_FIELDS.has(field) &&
      !errors[field]
    ) {
      errors[field] = fieldValidationMessage(field);
    }
    return errors;
  }, {});
}

function fieldValidationMessage(field) {
  const messages = {
    name: "Enter your name.",
    email: "Enter a valid email address.",
    password: "Check the password requirements.",
    company: "Enter a company name.",
    job_title: "Enter a job title.",
    job_url: "Enter a valid web URL.",
    location: "Check the location.",
    employment_type: "Check the employment type.",
    salary_min: "Enter a valid non-negative salary.",
    salary_max: "Enter a valid non-negative salary.",
    status: "Choose a valid application status.",
    applied_at: "Enter a valid application date.",
    notes: "Notes must be 10,000 characters or fewer.",
    application_id: "Choose a job application.",
    scheduled_at: "Enter a date and time with a time zone.",
    interview_type: "Choose a valid interview type.",
    meeting_url: "Enter a valid HTTP or HTTPS URL.",
  };
  return messages[field] ?? "Check this field.";
}

async function request(path, { token, ...options } = {}) {
  const method = options.method ?? "GET";
  if (method === "GET") {
    const key = `${token ?? ""}\n${path}`;
    const inFlight = inFlightGetRequests.get(key);
    if (inFlight) return inFlight;

    const pending = performRequest(path, { token, ...options });
    inFlightGetRequests.set(key, pending);
    try {
      return await pending;
    } finally {
      if (inFlightGetRequests.get(key) === pending) {
        inFlightGetRequests.delete(key);
      }
    }
  }

  return performRequest(path, { token, ...options });
}

async function performRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Unable to connect to JobTrack. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new ApiError(
        "The server returned an invalid response.",
        response.status,
      );
    }
  }

  if (!response.ok) {
    const apiError = payload?.error;
    const fieldErrors = validationFieldErrors(apiError?.details);
    const message =
      apiError?.message ??
      (response.status >= 500
        ? "JobTrack is temporarily unavailable. Please try again."
        : "We couldn't complete that request. Please check your details.");
    const hasSalaryRangeError = apiError?.details?.some((detail) =>
      /salary_min must not exceed salary_max/i.test(detail.message ?? ""),
    );
    if (response.status === 422 && hasSalaryRangeError) {
      fieldErrors.salary_min = "Minimum salary cannot exceed maximum salary.";
      fieldErrors.salary_max = "Maximum salary must be at least the minimum.";
    }
    throw new ApiError(message, response.status, fieldErrors);
  }

  return payload;
}

export function registerAccount({ name, email, password }) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function requestAccessToken({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentUser(token) {
  return request("/api/auth/me", { token });
}

export async function authenticatedRequest(path, options = {}) {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    window.dispatchEvent(new Event("jobtrack:auth-expired"));
    throw new ApiError("Your session has ended. Please sign in again.", 401);
  }

  try {
    return await request(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.dispatchEvent(new Event("jobtrack:auth-expired"));
    }
    throw error;
  }
}
