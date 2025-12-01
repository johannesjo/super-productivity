// HERE YOU CAN PUT HELPFUL UTIL FUNCTIONS RELATED TO DOM ELEMENTS

/** Checks if the element is an input (input, textarea, or contenteditable) */
export const isInputElement = (el: HTMLElement): boolean => {
  return !!(
    el.tagName.toUpperCase() === 'INPUT' ||
    el.tagName.toUpperCase() === 'TEXTAREA' ||
    el.isContentEditable
  );
};
