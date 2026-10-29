import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { ApiError } from "../api/auth.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";

function safeReturnPath(location) {
  const from = location.state?.from;
  return typeof from?.pathname === "string" && from.pathname.startsWith("/app")
    ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
    : "/app";
}

export default function LoginPage() {
  const { signIn, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    email: location.state?.email ?? "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    return <Navigate replace to={safeReturnPath(location)} />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!values.email.trim()) nextErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!values.password) nextErrors.password = "Enter your password.";
    else if (values.password.length > 128) {
      nextErrors.password = "Password must be 128 characters or fewer.";
    }

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await signIn({
        email: values.email.trim(),
        password: values.password,
      });
      navigate(safeReturnPath(location), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
      } else {
        setFormError(
          error instanceof ApiError
            ? error.message
            : "We couldn't sign you in. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700">
        <Icon name="sparkle" size={15} />
        Welcome back
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        Sign in to JobTrack
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Pick up where you left off and keep your next move in focus.
      </p>

      {location.state?.message && (
        <p
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {location.state.message}
        </p>
      )}
      {formError && (
        <p
          className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800"
          role="alert"
        >
          {formError}
        </p>
      )}

      <form className="mt-7 space-y-5" noValidate onSubmit={handleSubmit}>
        <FormField
          autoComplete="email"
          error={errors.email}
          label="Email address"
          name="email"
          onChange={updateField}
          required
          type="email"
          value={values.email}
        />
        <FormField
          autoComplete="current-password"
          error={errors.password}
          label="Password"
          maxLength={128}
          name="password"
          onChange={updateField}
          required
          type="password"
          value={values.password}
        />
        <Button className="w-full" disabled={submitting} type="submit">
          {submitting && (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to JobTrack?{" "}
        <Link
          className="font-semibold text-indigo-600 hover:text-indigo-700"
          to="/register"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
