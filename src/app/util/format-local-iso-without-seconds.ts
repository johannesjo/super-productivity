export const formatLocalIsoWithoutSeconds = (timestamp: number): string => {
  const date = new Date(timestamp);

  // Set seconds and milliseconds to 0
  date.setSeconds(0, 0);

  // Format as local ISO string
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
};
