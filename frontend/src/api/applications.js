import { authenticatedRequest } from "./auth.js";

export function listApplications(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  return authenticatedRequest(`/api/applications${suffix}`);
}

export function getApplication(applicationId) {
  return authenticatedRequest(
    `/api/applications/${encodeURIComponent(applicationId)}`,
  );
}

export function createApplication(data) {
  return authenticatedRequest("/api/applications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateApplication(applicationId, data) {
  return authenticatedRequest(
    `/api/applications/${encodeURIComponent(applicationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteApplication(applicationId) {
  return authenticatedRequest(
    `/api/applications/${encodeURIComponent(applicationId)}`,
    { method: "DELETE" },
  );
}
