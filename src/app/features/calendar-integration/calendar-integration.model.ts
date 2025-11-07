export interface CalendarIntegrationEvent {
  id: string;
  calProviderId: string;
  title: string;
  description?: string;
  start: number;
  duration: number;
  /**
   * Previous IDs this event was known by. Used for backward compatibility
   * when event ID format changes (e.g., recurring event instances).
   */
  legacyIds?: string[];
}
