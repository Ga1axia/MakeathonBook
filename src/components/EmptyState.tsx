type EmptyStateProps = {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

/**
 * Quiet empty state with a single clear action.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__description">{description}</p>
      <button type="button" className="btn btn--primary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
