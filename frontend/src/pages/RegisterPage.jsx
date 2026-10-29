import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { ApiError, registerAccount } from "../api/auth.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import Icon from "../components/Icon.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate replace to="/app" />;

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Enter your name.";
    if (!values.email.trim()) nextErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (values.password.length < 12 || values.password.length > 128) {
      nextErrors.password = "Use a password between 12 and 128 characters.";
    }

    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await registerAccount({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate("/login", {
        replace: true,
        state: {
          email: values.email.trim(),
          message: "Your account is ready. Sign in to continue.",
        },
      });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "We couldn't create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700">
        <Icon name="sparkle" size={15} />
        Start with a clear next step
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        Create your account
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Set up your workspace and bring your job search into focus.
      </p>

      {location.state?.message && (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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
          autoComplete="name"
          error={errors.name}
          label="Your name"
          maxLength={120}
          name="name"
          onChange={updateField}
          required
          type="text"
          value={values.name}
        />
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
          autoComplete="new-password"
          error={errors.password}
          hint="Use at least 12 characters."
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
          {submitting ? "Creating account..." : "Create account"}
        </Button>
        <p className="text-center text-xs leading-5 text-slate-400">
          Your password is sent to the JobTrack API when you submit and is
          never saved in browser storage.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          className="font-semibold text-indigo-600 hover:text-indigo-700"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
