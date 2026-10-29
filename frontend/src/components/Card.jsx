export default function Card({ children, className = "", ...props }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
