/**
 * Generates a deterministic numeric notification ID from a string reminder ID.
 * This ensures the same reminder always gets the same notification ID,
 * preventing duplicate notifications on Android.
 *
 * @param reminderId - The reminder's relatedId (task/note ID)
 * @returns A positive integer suitable for Android notification ID
 */
export const generateNotificationId = (reminderId: string): number => {
  if (!reminderId || typeof reminderId !== 'string') {
    throw new Error('Invalid reminderId: must be a non-empty string');
  }

  // Simple hash function to convert string to positive integer
  let hash = 0;
  for (let i = 0; i < reminderId.length; i++) {
    const char = reminderId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Ensure positive integer and within safe range for Android
  return Math.abs(hash) % 2147483647;
};
