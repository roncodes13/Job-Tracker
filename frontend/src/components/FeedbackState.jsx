import Button from "./Button.jsx";
import Card from "./Card.jsx";
import Icon from "./Icon.jsx";

const stateContent = {
  loading: {
    icon: "activity",
    title: "Loading your workspace",
    description: "Just a moment while everything gets ready.",
  },
  error: {
    icon: "activity",
    title: "That didn't load",
    description: "There was a problem loading this content. Please try again.",
  },
  empty: {
    icon: "sparkle",
    title: "A fresh start",
    description: "Your workspace is ready. This area will fill in as you go.",
  },
};

export default function FeedbackState({
  variant = "empty",
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  const content = stateContent[variant];

  return (
    <Card
      className={`flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center ${className}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <div
        className={`mb-5 flex size-12 items-center justify-center rounded-2xl ${variant === "error" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}
      >
        {variant === "loading" ? (
          <span className="size-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        ) : (
          <Icon name={content.icon} size={22} />
        )}
      </div>
      <h2 className="text-base font-semibold text-slate-900">
        {title ?? content.title}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description ?? content.description}
      </p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction} size="sm" variant="secondary">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
