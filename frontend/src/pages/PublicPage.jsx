import { Link } from "react-router";
import AuthLayout from "../layouts/AuthLayout.jsx";
import Button from "../components/Button.jsx";
import Icon from "../components/Icon.jsx";

export default function PublicPage() {
  return (
    <AuthLayout>
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700">
        <Icon name="sparkle" size={15} />
        Make your next move count
      </div>
      <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl">
        Your next opportunity, <span className="text-indigo-600">in focus.</span>
      </h1>
      <p className="mt-5 text-base leading-7 text-slate-500">
        A calmer way to keep your job search organized. Bring your plans,
        conversations, and next steps together.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button as={Link} to="/register">
          Get started
          <Icon name="chevron" size={16} />
        </Button>
        <Button as={Link} to="/login" variant="secondary">
          Sign in
        </Button>
      </div>
    </AuthLayout>
  );
}
