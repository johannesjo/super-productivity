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

    class Property {
      getValues(): string[];
      // Add other property methods as needed
    }

    class Component {
      constructor(jCal: ICalJCal | ICalJCal[]);
      getAllSubcomponents(name?: string): Component[];
      getFirstSubcomponent(name: string): Component | null;
      getFirstPropertyValue(name: string): ICalPropertyValue;
      getAllProperties(name: string): Property[];
      updatePropertyWithValue(name: string, value: ICalPropertyValue): void;
      removeProperty(name: string): void;
    }

    class Timezone {
      constructor(options: ICalTimezoneOptions);
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

    function parse(icalData: string): ICalJCal[];
    function stringify(jCal: ICalJCal | ICalJCal[]): string;

    // Base types for ical.js
    type ICalJCal = [string, Record<string, unknown>[], unknown[]];
    type ICalPropertyValue = string | number | Date | boolean | unknown[] | Time;
    type ICalTimezoneOptions = Record<string, unknown>;
  }
}
