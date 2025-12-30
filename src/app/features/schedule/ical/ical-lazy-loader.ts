/**
 * Lazy loader for ical.js to reduce initial bundle size.
 * The ical.js library is ~76KB and only needed for calendar integration.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let icalModule: any = null;

/**
 * Lazily loads the ical.js module on first use.
 * Subsequent calls return the cached module.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadIcalModule = async (): Promise<any> => {
  if (!icalModule) {
    // @ts-ignore - ical.js exports default
    const mod = await import('ical.js');
    // Handle both ESM default export and CommonJS module.exports
    icalModule = mod.default || mod;
  }
  return icalModule;
};
