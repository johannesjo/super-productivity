import { Component, JSX } from 'solid-js';

interface CardProps {
  onClick?: () => void;
  class?: string;
  children: JSX.Element;
}

export const Card: Component<CardProps> = (props) => {
  const baseClass = 'card';
  const clickableClass = props.onClick ? 'card-clickable' : '';
  const customClass = props.class || '';

  return (
    <button
      class={`${baseClass} ${clickableClass} ${customClass}`.trim()}
      onClick={props.onClick}
      disabled={!props.onClick}
    >
      {props.children}
    </button>
  );
};
