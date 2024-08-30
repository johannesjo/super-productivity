export const combineDateAndTime = (datePart: Date, timePart: Date): Date => {
  // Extract date components from datePart
  const year = datePart.getFullYear();
  const month = datePart.getMonth();
  const day = datePart.getDate();

  // Extract time components from timePart
  const hours = timePart.getHours();
  const minutes = timePart.getMinutes();
  const seconds = timePart.getSeconds();

  // Create a new date with combined date and time components
  return new Date(year, month, day, hours, minutes, seconds);
};
