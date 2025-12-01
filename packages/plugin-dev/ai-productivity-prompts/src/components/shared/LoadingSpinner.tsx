import { Component } from 'solid-js';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  return (
    <div class="loading-container">
      <p class="text-muted">{props.message || 'Loading...'}</p>
    </div>
  );
};
