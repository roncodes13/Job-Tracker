import { NavLink } from "react-router";
import Icon from "../components/Icon.jsx";

const navigation = [
  { label: "Overview", to: "/app", icon: "grid", end: true },
  { label: "Applications", to: "/app/applications", icon: "briefcase" },
  { label: "Interviews", to: "/app/interviews", icon: "calendar" },
  { label: "Analytics", to: "/app/analytics", icon: "chart" },
];

export default function Sidebar({ onNavigate, mobile = false }) {
  return (
    <aside
      aria-label="Primary navigation"
      className={`flex h-full flex-col border-r border-slate-200/80 bg-white ${mobile ? "w-[min(19rem,88vw)]" : "w-64"}`}
    >
      <div className="flex h-[76px] items-center gap-3 px-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
          <Icon name="briefcase" size={19} />
        </div>
        <span className="text-[17px] font-bold tracking-tight text-slate-900">
          Job<span className="text-indigo-600">Track</span>
        </span>
      </div>

      <div className="px-4 pt-5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        <nav className="mt-3 space-y-1">
          {navigation.map((item) => (
            <NavLink
              aria-label={item.label}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
              end={item.end}
              key={item.to}
              onClick={onNavigate}
              to={item.to}
            >
              <Icon className="shrink-0" name={item.icon} size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-100 p-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
            <Icon name="sparkle" size={17} />
          </div>
          <p className="text-sm font-semibold text-slate-800">One step at a time</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Your next opportunity starts with a little organization.
          </p>
        </div>
        <NavLink
          className="mt-4 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          onClick={onNavigate}
          to="/app/settings"
        >
          <Icon name="settings" size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
