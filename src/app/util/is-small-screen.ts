// see _variables.scss $layout-xs
const THRESHOLD = 600;

export const isSmallScreen = (): boolean => {
  return screen.width < THRESHOLD;
};
