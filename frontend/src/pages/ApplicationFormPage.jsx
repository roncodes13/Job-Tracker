import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/auth.js";
import {
  createApplication,
  getApplication,
  updateApplication,
} from "../api/applications.js";
import ApplicationForm from "../features/applications/ApplicationForm.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import FeedbackState from "../components/FeedbackState.jsx";
import Icon from "../components/Icon.jsx";

export default function ApplicationFormPage({ mode }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const isEditing = mode === "edit";
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    setLoading(true);
    getApplication(applicationId)
      .then((result) => {
        if (active) setApplication(result);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We couldn't load this application.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId, isEditing]);

  async function handleSubmit(payload) {
    if (isEditing) {
      await updateApplication(applicationId, payload);
      navigate("/app/applications", {
        replace: true,
        state: { success: "Application updated successfully." },
      });
    } else {
      await createApplication(payload);
      navigate("/app/applications", {
        replace: true,
        state: { success: "Application added successfully." },
      });
    }
  }

  const title = isEditing ? "Edit application" : "Add an application";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
          to={isEditing ? `/app/applications/${applicationId}` : "/app/applications"}
        >
          <Icon name="arrowLeft" size={16} />
          {isEditing ? "Back to application" : "All applications"}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isEditing
            ? "Keep the details for this opportunity up to date."
            : "Capture the important details while they're fresh."}
        </p>
      </div>

      {loading ? (
        <FeedbackState variant="loading" />
      ) : error ? (
        <FeedbackState
          actionLabel="Back to applications"
          description={error}
          onAction={() => navigate("/app/applications")}
          variant="error"
        />
      ) : (
        <Card className="p-5 sm:p-8">
          <ApplicationForm
            application={application}
            onCancelTo={
              isEditing
                ? `/app/applications/${applicationId}`
                : "/app/applications"
            }
            onSubmit={handleSubmit}
            submitLabel={isEditing ? "Save changes" : "Add application"}
          />
        </Card>
      )}
    </div>
  );
}
