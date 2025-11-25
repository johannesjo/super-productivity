import { FH } from './schedule.const';

/**
 * Calculates a timestamp from a Y position relative to the schedule grid
 * @param clientY - The Y position (from mouse/touch event)
 * @param gridRect - The bounding rectangle of the grid container
 * @param targetDay - The target day in YYYY-MM-DD format (optional, defaults to today)
 * @returns Timestamp in milliseconds or null if calculation fails
 */
export const calculateTimeFromYPosition = (
  clientY: number,
  gridRect: DOMRect,
  targetDay?: string,
): number | null => {
  const relativeY = clientY - gridRect.top;

  // Calculate which row/time this corresponds to
  const totalRows = 24 * FH; // Total rows = 24 hours * FH rows per hour
  const rowHeight = gridRect.height / totalRows;

  // Calculate row index (grid rows start at 1, not 0)
  const rowIndex = Math.round(relativeY / rowHeight) + 1;

  // Convert row to time
  // The row needs to be adjusted by -1 because CSS grid rows are 1-indexed
  const hours = Math.floor((rowIndex - 1) / FH);
  const minutes = Math.floor(((rowIndex - 1) % FH) * (60 / FH));

  // Clamp to valid time range (0-23 hours, 0-59 minutes)
  const clampedHours = Math.max(0, Math.min(23, hours));
  const clampedMinutes = Math.max(0, Math.min(59, minutes));

  // Create date with the calculated time
  let targetDate: Date;

  if (targetDay) {
    // Parse the target day if provided
    const [year, month, day] = targetDay.split('-').map(Number);
    targetDate = new Date(year, month - 1, day, clampedHours, clampedMinutes);
  } else {
    // Use today if no target day specified
    const today = new Date();
    targetDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      clampedHours,
      clampedMinutes,
    );
  }

  return targetDate.getTime();
};

/**
 * Calculates time from a drag event on the schedule grid
 * @param event - Mouse or touch event
 * @param gridElement - The grid container element
 * @param targetDay - The target day in YYYY-MM-DD format (optional)
 * @returns Timestamp in milliseconds or null if calculation fails
 */
export const calculateDropTimeFromEvent = (
  event: MouseEvent | TouchEvent,
  gridElement: HTMLElement | null,
  targetDay?: string,
): number | null => {
  if (!gridElement) {
    return null;
  }

  // Get mouse/touch position
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

  // Get the grid's bounding rectangle
  const gridRect = gridElement.getBoundingClientRect();

  return calculateTimeFromYPosition(clientY, gridRect, targetDay);
};
