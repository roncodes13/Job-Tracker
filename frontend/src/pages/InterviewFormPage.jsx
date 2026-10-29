import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError } from "../api/auth.js";
import {
  createInterview,
  getInterview,
  updateInterview,
} from "../api/interviews.js";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import Icon from "../components/Icon.jsx";
import InterviewForm from "../features/interviews/InterviewForm.jsx";

export default function InterviewFormPage({ mode }) {
  const { interviewId } = useParams();
  const [searchParams] = useSearchParams();
  const initialApplicationId = searchParams.get("application_id") ?? "";
  const navigate = useNavigate();
  const isEditing = mode === "edit";
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    getInterview(interviewId)
      .then((result) => {
        if (active) setInterview(result);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load this interview.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [interviewId, isEditing]);

  async function handleSubmit(applicationId, payload) {
    if (isEditing) {
      await updateInterview(interviewId, payload);
      navigate("/app/interviews", {
        replace: true,
        state: { success: "Interview updated successfully." },
      });
    } else {
      await createInterview(applicationId, payload);
      navigate("/app/interviews", {
        replace: true,
        state: { success: "Interview scheduled successfully." },
      });
    }
  }

  const cancelTo = isEditing
    ? "/app/interviews"
    : initialApplicationId
      ? `/app/applications/${initialApplicationId}`
      : "/app/interviews";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
        to={cancelTo}
      >
        <Icon name="arrowLeft" size={16} />
        {isEditing ? "All interviews" : "Back"}
      </Link>
      <div>
        <p className="text-sm font-medium text-indigo-600">Workspace</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
          {isEditing ? "Edit interview" : "Schedule an interview"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Keep the time, meeting details, and preparation notes together.
        </p>
      </div>

      {loading ? (
        <FeedbackState variant="loading" />
      ) : error ? (
        <FeedbackState
          actionLabel="Back to interviews"
          description={error}
          onAction={() => navigate("/app/interviews")}
          variant="error"
        />
      ) : (
        <Card className="p-5 sm:p-8">
          <InterviewForm
            cancelTo={cancelTo}
            initialApplicationId={initialApplicationId}
            interview={interview}
            onSubmit={handleSubmit}
            submitLabel={isEditing ? "Save changes" : "Schedule interview"}
          />
        </Card>
      )}
    </div>
  );
}
