import { authenticatedRequest } from "./auth.js";

export function listInterviews({ scheduledFrom, scheduledTo } = {}) {
  const query = new URLSearchParams();
  if (scheduledFrom) query.set("scheduled_from", scheduledFrom);
  if (scheduledTo) query.set("scheduled_to", scheduledTo);
  const suffix = query.size ? `?${query.toString()}` : "";
  return authenticatedRequest(`/api/interviews${suffix}`);
}

export function getInterview(interviewId) {
  return authenticatedRequest(
    `/api/interviews/${encodeURIComponent(interviewId)}`,
  );
}

export function createInterview(applicationId, data) {
  return authenticatedRequest(
    `/api/applications/${encodeURIComponent(applicationId)}/interviews`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function updateInterview(interviewId, data) {
  return authenticatedRequest(
    `/api/interviews/${encodeURIComponent(interviewId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteInterview(interviewId) {
  return authenticatedRequest(
    `/api/interviews/${encodeURIComponent(interviewId)}`,
    { method: "DELETE" },
  );
}
