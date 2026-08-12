// Framework-free iCalendar (RFC 5545) parser for the VEVENT subset used by the
// calendar integrations. Returns normalized events; the full calendar text is
// read via the provider's transport. Deterministic and escaping-correct.
const unfoldLines = (text) => {
    const lines = [];
    for (const raw of text.replace(/\r/g, '').split('\n')) {
        if (raw.startsWith(' ') || raw.startsWith('\t')) {
            lines[lines.length - 1] = `${lines[lines.length - 1] ?? ''}${raw.slice(1)}`;
        }
        else if (raw) {
            lines.push(raw);
        }
    }
    return lines;
};
const unescape = (value) => value
    .replace(/\\\\/g, '\\')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\n/g, '\n');
const parseDateValue = (value) => {
    const stripped = value.replace(/[:-]/g, '');
    if (/^\d{8}$/.test(stripped)) {
        const date = stripped;
        return {
            iso: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
            allDay: true,
        };
    }
    if (/^\d{8}T\d{6}Z$/.test(stripped)) {
        return {
            iso: new Date(Date.UTC(Number(stripped.slice(0, 4)), Number(stripped.slice(4, 6)) - 1, Number(stripped.slice(6, 8)), Number(stripped.slice(9, 11)), Number(stripped.slice(11, 13)))).toISOString(),
            allDay: false,
        };
    }
    if (/^\d{8}T\d{6}$/.test(stripped)) {
        // Floating local time is treated as UTC-like to stay deterministic.
        return {
            iso: new Date(Date.UTC(Number(stripped.slice(0, 4)), Number(stripped.slice(4, 6)) - 1, Number(stripped.slice(6, 8)), Number(stripped.slice(9, 11)), Number(stripped.slice(11, 13)))).toISOString(),
            allDay: false,
        };
    }
    return { iso: '', allDay: false };
};
export const parseIcs = (text) => {
    const components = [];
    let current;
    for (const line of unfoldLines(text)) {
        const begin = /^BEGIN:(.+)/i.exec(line);
        const end = /^END:(.+)/i.exec(line);
        if (begin) {
            current = { name: begin[1].toUpperCase(), properties: [] };
            components.push(current);
            continue;
        }
        if (end && current) {
            current = undefined;
            continue;
        }
        if (!current)
            continue;
        const colon = line.indexOf(':');
        if (colon < 0)
            continue;
        const namePart = line.slice(0, colon);
        const name = namePart.split(';')[0].toUpperCase();
        const params = {};
        for (const param of namePart.split(';').slice(1)) {
            const eq = param.indexOf('=');
            if (eq > 0)
                params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1);
        }
        current.properties.push({ name, value: unescape(line.slice(colon + 1)), params });
    }
    const events = [];
    for (const component of components) {
        if (component.name !== 'VEVENT')
            continue;
        const prop = (name) => component.properties.find((entry) => String(entry.name).toUpperCase() === name)
            ?.value ?? '';
        const start = parseDateValue(prop('DTSTART'));
        const end = parseDateValue(prop('DTEND'));
        const endIso = end.iso || start.iso;
        events.push({
            uid: prop('UID') || `${start.iso || 'x'}-${events.length}`,
            summary: prop('SUMMARY'),
            description: prop('DESCRIPTION'),
            location: prop('LOCATION'),
            start: start.iso,
            end: endIso,
            allDay: start.allDay,
            rrule: prop('RRULE') || undefined,
        });
    }
    return events;
};
