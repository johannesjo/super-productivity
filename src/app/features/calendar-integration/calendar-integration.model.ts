export interface CalendarIntegrationEvent {
  id: string;
  calProviderId: string;
  title: string;
  description?: string;
  start: number;
  duration: number;
}
