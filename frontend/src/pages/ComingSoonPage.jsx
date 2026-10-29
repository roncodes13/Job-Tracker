import FeedbackState from "../components/FeedbackState.jsx";

export default function ComingSoonPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">Workspace</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Coming soon
        </h1>
      </div>
      <FeedbackState
        description="This shared workspace is ready for the next feature. No feature-specific pages are included yet."
        title="This space is taking shape"
      />
    </div>
  );
}
