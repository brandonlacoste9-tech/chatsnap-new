import type { ReactNode } from "react";

/** Centered empty state with optional CTA — keeps lists feeling intentional. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden>
        {icon}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {body && <p className="empty-state-body muted">{body}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
