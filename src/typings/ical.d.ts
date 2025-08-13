// Type override for ical.js to fix TypeScript v5.8+ compatibility issue
declare module 'ical.js' {
  namespace ICAL {
    class Time {
      static now(): Time;
      icaltype: string;
    }

    class VCardTime extends Time {
      // Override the property to fix TypeScript error TS2610
      icaltype: string;
    }

    class Component {
      constructor(jCal: any);
      getAllSubcomponents(name?: string): Component[];
    }

    class Timezone {
      constructor(options: any);
      tzid: string;
    }

    const TimezoneService: {
      has(tzid: string): boolean;
      register(timezone: Timezone): void;
      remove(tzid: string): void;
    };

    const helpers: {
      updateTimezones(comp: Component): Component;
    };

    function parse(icalData: string): any;
    function stringify(jCal: any): string;
  }
}
