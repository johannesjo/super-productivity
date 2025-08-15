// Type override for ical.js to fix TypeScript v5.8+ compatibility issue
declare module 'ical.js' {
  export = ICAL;
  namespace ICAL {
    class Time {
      static now(): Time;
      icaltype: string;
      toJSDate(): Date;
    }

    class VCardTime extends Time {
      // Override the property to fix TypeScript error TS2610
      icaltype: string;
    }

    class Component {
      constructor(jCal: any);
      getAllSubcomponents(name?: string): Component[];
      getFirstSubcomponent(name: string): Component | null;
      getFirstPropertyValue(name: string): any;
      getAllProperties(name: string): any[];
      updatePropertyWithValue(name: string, value: any): void;
      removeProperty(name: string): void;
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
