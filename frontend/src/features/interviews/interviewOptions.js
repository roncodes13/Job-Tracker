export const INTERVIEW_TYPES = [
  { value: "phone", label: "Phone" },
  { value: "video", label: "Video" },
  { value: "onsite", label: "On-site" },
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "other", label: "Other" },
];

export function interviewTypeLabel(value) {
  return INTERVIEW_TYPES.find((item) => item.value === value)?.label ?? "Interview";
}

export function formatInterviewDate(value, options = {}) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
}
