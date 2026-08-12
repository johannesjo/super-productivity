import { requestText } from './http';
import { parseIcs } from './ical';
export const calDavDefaultPath = (emailOrUser) => `/remote.php/dav/calendars/${encodeURIComponent(emailOrUser)}`;
export class CalDavClient {
    #config;
    constructor(config) {
        this.#config = config;
    }
    /** Lists calendar collection paths under the principal. */
    async listCalendars(path) {
        const { body } = await requestText({
            baseUrl: this.#config.baseUrl,
            path,
            auth: this.#config.auth,
            method: 'GET',
            headers: { depth: '1', accept: 'text/xml,text/calendar' },
            fetch: this.#config.fetch,
        });
        // Extract hrefs that look like calendar collections (.ics entries).
        const hrefs = [...body.matchAll(/<D:href>([^<]+)<\/D:href>/g)].map((match) => match[1]);
        return hrefs.filter((href) => /\/(?:personal|work|calendar|events)\/?$/i.test(href));
    }
    /** Fetches events in [start, end] for a calendar path. */
    async events(path, start, end) {
        const startIso = toCalDavDate(start);
        const endIso = toCalDavDate(end);
        const report = [
            '<?xml version="1.0" encoding="utf-8"?>',
            '<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">',
            '  <D:prop><D:getetag/><C:calendar-data/></D:prop>',
            `  <C:filter><C:comp-filter name="VCALENDAR"><C:comp-filter name="VEVENT">`,
            `    <C:time-range start="${startIso}" end="${endIso}"/>`,
            '  </C:comp-filter></C:comp-filter></C:filter>',
            '</C:calendar-query>',
        ].join('\n');
        const { body } = await requestText({
            baseUrl: this.#config.baseUrl,
            path,
            auth: this.#config.auth,
            method: 'REPORT',
            headers: {
                depth: '1',
                'content-type': 'application/xml; charset=utf-8',
                'content-length': String(report.length),
                accept: 'text/xml,text/calendar',
            },
            fetch: this.#config.fetch,
        });
        // Extract embedded VCALENDAR payloads.
        const payloads = [
            ...body.matchAll(/<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/g),
        ].map((match) => match[1]);
        return payloads.flatMap((payload) => parseIcs(payload));
    }
}
export const toCalDavDate = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
