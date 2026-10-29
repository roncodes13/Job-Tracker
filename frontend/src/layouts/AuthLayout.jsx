import { Link } from "react-router";
import Icon from "../components/Icon.jsx";

export default function AuthLayout({ children }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-white lg:grid-cols-[1fr_0.9fr]">
      <div className="absolute -left-40 -top-40 size-[26rem] rounded-full bg-indigo-50/80 blur-3xl" />
      <section className="relative flex flex-col justify-between px-6 py-7 sm:px-10 lg:px-16 lg:py-10">
        <Link aria-label="JobTrack home" className="flex w-fit items-center gap-3" to="/">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Icon name="briefcase" size={20} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Job<span className="text-indigo-600">Track</span>
          </span>
        </Link>

        <div className="mx-auto w-full max-w-md py-12 sm:py-16">{children}</div>

        <p className="text-xs text-slate-400">
          Built to bring a little more clarity to your career journey.
        </p>
      </section>

      <aside className="relative hidden items-center justify-center overflow-hidden bg-slate-50 px-10 py-14 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_35%,rgba(199,210,254,0.55),transparent_48%)]" />
        <div className="relative w-full max-w-lg rotate-[-1deg] rounded-3xl border border-white bg-white p-5 shadow-[0_32px_90px_-40px_rgba(30,41,59,0.3)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon name="grid" size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Your workspace</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  A clearer view of what's next
                </p>
              </div>
            </div>
            <span className="size-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-200" />
          </div>
          <div className="grid grid-cols-3 gap-3 py-5">
            {[
              ["Applications", "briefcase"],
              ["Interviews", "calendar"],
              ["Next steps", "activity"],
            ].map(([label, icon]) => (
              <div className="rounded-2xl border border-slate-100 p-3" key={label}>
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name={icon} size={16} />
                </span>
                <p className="mt-4 text-[11px] font-medium text-slate-500">{label}</p>
                <div className="mt-2 h-2 w-10 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">A steady rhythm</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Your progress, at a glance
                </p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Icon name="chart" size={16} />
              </span>
            </div>
            <div className="mt-5 flex h-24 items-end gap-2">
              {[34, 48, 40, 62, 54, 80, 68, 94, 72, 86, 66, 100].map(
                (height, index) => (
                  <span
                    className={`flex-1 rounded-t-md ${index === 11 ? "bg-indigo-500" : "bg-indigo-100"}`}
                    key={index}
                    style={{ height: `${height}%` }}
                  />
                ),
              )}
            </div>
          </div>
          <div className="absolute -bottom-5 -left-7 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="check" size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800">You’ve got this</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                One step at a time
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
