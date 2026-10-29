import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "../components/Button.jsx";
import Icon from "../components/Icon.jsx";

export default function TopNavigation({ onMenuClick }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const userInitial = user?.name?.trim()?.[0]?.toUpperCase() ?? "J";
  const currentPage = location.pathname.startsWith("/app/applications")
    ? "Applications"
    : location.pathname.startsWith("/app/interviews")
      ? "Interviews"
      : location.pathname.startsWith("/app/analytics")
        ? "Analytics"
        : location.pathname.startsWith("/app/settings")
          ? "Settings"
          : "Overview";

  function handleSignOut() {
    signOut();
    navigate("/login", {
      replace: true,
      state: { message: "You have signed out." },
    });
  }

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          aria-label="Open navigation menu"
          className="lg:hidden"
          onClick={onMenuClick}
          size="sm"
          variant="ghost"
        >
          <Icon name="menu" />
        </Button>
        <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
          <span>Workspace</span>
          <Icon className="text-slate-300" name="chevron" size={15} />
          <span className="truncate font-medium text-slate-800">{currentPage}</span>
        </div>
        <span className="truncate text-sm font-semibold text-slate-800 sm:hidden">
          JobTrack
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <label className="hidden h-10 w-56 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition focus-within:border-indigo-300 focus-within:bg-white md:flex lg:w-64">
          <Icon name="search" size={17} />
          <span className="sr-only">Search your workspace</span>
          <input
            aria-label="Search your workspace"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search anything"
            type="search"
          />
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            /
          </kbd>
        </label>
        <Button
          aria-label="Notifications"
          className="relative"
          size="sm"
          variant="ghost"
        >
          <Icon name="bell" size={19} />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-indigo-500 ring-2 ring-white" />
        </Button>
        <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />
        <div className="relative flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {userInitial}
            </span>
            <span className="max-w-40 text-left">
              <span className="block truncate text-xs font-semibold leading-4 text-slate-800">
                {user?.name}
              </span>
              <span className="block truncate text-[11px] leading-4 text-slate-500">
                {user?.email}
              </span>
            </span>
          </div>
          <Button
            aria-label="Sign out"
            className="sm:hidden"
            onClick={handleSignOut}
            size="sm"
            variant="ghost"
          >
            <Icon name="logOut" size={18} />
          </Button>
          <div className="hidden sm:block">
            <Button
              aria-controls="profile-menu"
              aria-expanded={profileMenuOpen}
              aria-label="Open account menu"
              onClick={() => setProfileMenuOpen((open) => !open)}
              size="sm"
              variant="ghost"
            >
              <Icon name="arrowDown" size={15} />
            </Button>
            {profileMenuOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                id="profile-menu"
              >
                <button
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                  onClick={handleSignOut}
                  type="button"
                >
                  <Icon name="logOut" size={17} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
