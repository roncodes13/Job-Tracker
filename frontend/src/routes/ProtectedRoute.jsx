import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import Button from "../components/Button.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, status, retrySessionCheck } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-5">
        <FeedbackState variant="loading" />
      </main>
    );
  }
  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-5">
        <FeedbackState
          actionLabel="Try again"
          description="We couldn't verify your saved session. Check your connection and try again."
          onAction={retrySessionCheck}
          variant="error"
        />
      </main>
    );
  }

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate replace state={{ from: location }} to="/login" />
  );
}
