import { CalendarIntegrationEvent } from './calendar-integration.model';

export const getCalendarEventIdCandidates = (
  calEv: CalendarIntegrationEvent,
): string[] => {
  const legacyIds = calEv.legacyIds || [];
  return [calEv.id, ...legacyIds];
};

export const matchesAnyCalendarEventId = (
  calEv: CalendarIntegrationEvent,
  ids: string[],
): boolean => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return false;
  }

  return getCalendarEventIdCandidates(calEv).some((candidateId) =>
    ids.includes(candidateId),
  );
};

export const shareCalendarEventId = (
  a: CalendarIntegrationEvent,
  b: CalendarIntegrationEvent,
): boolean => {
  const candidatesA = getCalendarEventIdCandidates(a);
  const candidateSetB = new Set(getCalendarEventIdCandidates(b));
  return candidatesA.some((id) => candidateSetB.has(id));
};
