import { authenticatedRequest } from "./auth.js";

export function getAnalyticsSummary() {
  return authenticatedRequest("/api/analytics/summary");
}
