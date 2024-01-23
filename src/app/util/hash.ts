// TAKEN from https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
// NOTE: NEVER CHANGE THIS AS IT IS USED FOR ID GENERATION
const SEED = 454;
const cyrb53a = (str: string): number => {
  let h1 = 0xdeadbeef ^ SEED,
    h2 = 0x41c6ce57 ^ SEED;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x85ebca77);
    h2 = Math.imul(h2 ^ ch, 0xc2b2ae3d);
  }
  h1 ^= Math.imul(h1 ^ (h2 >>> 15), 0x735a2d97);
  h2 ^= Math.imul(h2 ^ (h1 >>> 15), 0xcaf649a9);
  h1 ^= h2 >>> 16;
  h2 ^= h1 >>> 16;
  // eslint-disable-next-line no-mixed-operators
  return 2097152 * (h2 >>> 0) + (h1 >>> 11);
};

// NOTE: NEVER CHANGE THIS FN AS IT IS USED FOR ID GENERATION
export const hash = (str: string): string => cyrb53a(str).toString();
