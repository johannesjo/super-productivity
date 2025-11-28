export const uuidv7 = (): string => {
  // 32-bit time_high
  const ts = Date.now();

  // 12-bit rand_a (in v7, some bits are time_low but JS Date.now is ms precision)
  // We can put more random bits.
  // UUID v7 format:
  // 0                   1                   2                   3
  // 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |                           unix_ts_ms                          |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |          unix_ts_ms           |  ver  |       rand_a          |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |var|                        rand_b                             |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |                            rand_b                             |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

  const values = new Uint8Array(16);
  crypto.getRandomValues(values);

  // 48-bit timestamp (big-endian)
  values[0] = (ts >>> 40) & 0xff;
  values[1] = (ts >>> 32) & 0xff;
  values[2] = (ts >>> 24) & 0xff;
  values[3] = (ts >>> 16) & 0xff;
  values[4] = (ts >>> 8) & 0xff;
  values[5] = ts & 0xff;

  // Version 7 (0x7) in top 4 bits of byte 6
  values[6] = (values[6] & 0x0f) | 0x70;

  // Variant (10) in top 2 bits of byte 8
  values[8] = (values[8] & 0x3f) | 0x80;

  return [...values]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
};
