export const isSnap = (): boolean => {
  return window && window.process && window.process.env && !!window.process.env.SNAP;
};
