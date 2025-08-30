import { Component, JSX } from 'solid-js';

interface ButtonProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'back';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  title?: string;
  class?: string;
  children: JSX.Element;
}

export const Button: Component<ButtonProps> = (props) => {
  const getButtonClass = () => {
    const baseClass = 'button';
    const variantClass = props.variant
      ? `${baseClass}-${props.variant}`
      : 'action-button primary';
    const sizeClass = props.size ? `${baseClass}-${props.size}` : '';
    const customClass = props.class || '';

    if (props.variant === 'back') {
      return 'back-button';
    }

    return `${variantClass} ${sizeClass} ${customClass}`.trim();
  };

  return (
    <button
      class={getButtonClass()}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  );
};
