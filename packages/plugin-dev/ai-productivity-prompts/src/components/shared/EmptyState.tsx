import { Component, JSX } from 'solid-js';

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: JSX.Element;
}

export const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="empty-state">
      <p class="text-muted">{props.title}</p>
      {props.message && <p class="text-muted">{props.message}</p>}
      {props.action}
    </div>
  );
};
