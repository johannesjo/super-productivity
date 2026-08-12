export const weekDates = (weekStart, days = 7) => {
    const start = new Date(`${weekStart}T00:00:00Z`).getTime();
    return Array.from({ length: days }, (_, index) => {
        const day = new Date(start + index * 86_400_000);
        return day.toISOString().slice(0, 10);
    });
};
const dayOf = (iso) => iso ? iso.slice(0, 10) : undefined;
/** Projects calendar events onto the day buckets of a week. */
export const calendarAgenda = (events, weekStart) => {
    const dates = weekDates(weekStart);
    const buckets = new Map();
    for (const date of dates)
        buckets.set(date, []);
    for (const event of events) {
        const start = event.start ?? event.end ?? '';
        const date = dayOf(start);
        if (!date || !buckets.has(date))
            continue;
        const entry = {
            id: event.uid,
            date,
            summary: event.summary || '(untitled)',
            start,
            allDay: Boolean(event.allDay),
        };
        buckets.get(date)?.push(entry);
    }
    return dates.map((date) => ({ date, events: buckets.get(date) ?? [] }));
};
/** True when a week has at least one event (used for agenda badge counts). */
export const agendaCount = (agenda) => agenda.reduce((total, day) => total + day.events.length, 0);
