export const parseIsoDuration = (duration: string): number => {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  // ISO 8601 duration format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
  const regex =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
  const match = duration.match(regex);

  if (!match) {
    return 0;
  }

  const years = parseInt(match[1] || '0', 10);
  const months = parseInt(match[2] || '0', 10);
  const days = parseInt(match[3] || '0', 10);
  const hours = parseInt(match[4] || '0', 10);
  const minutes = parseInt(match[5] || '0', 10);
  const seconds = parseFloat(match[6] || '0');

  // Convert to milliseconds
  const msPerSecond = 1000;
  const msPerMinute = 60 * msPerSecond;
  const msPerHour = 60 * msPerMinute;
  const msPerDay = 24 * msPerHour;
  const msPerMonth = 30 * msPerDay; // Approximation
  const msPerYear = 365 * msPerDay; // Approximation

  /* eslint-disable no-mixed-operators */
  return (
    years * msPerYear +
    months * msPerMonth +
    days * msPerDay +
    hours * msPerHour +
    minutes * msPerMinute +
    seconds * msPerSecond
  );
  /* eslint-enable no-mixed-operators */
};
