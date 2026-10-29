import { statusLabel } from "./applicationOptions.js";

const colors = {
  saved: "bg-slate-100 text-slate-700",
  applied: "bg-blue-50 text-blue-700",
  interviewing: "bg-violet-50 text-violet-700",
  offer: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  withdrawn: "bg-amber-50 text-amber-800",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status] ?? colors.saved}`}
    >
      {statusLabel(status)}
    </span>
  );
}
