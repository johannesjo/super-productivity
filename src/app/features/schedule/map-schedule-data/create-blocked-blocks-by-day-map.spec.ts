import { createBlockedBlocksByDayMap } from './create-blocked-blocks-by-day-map';

/* eslint-disable @typescript-eslint/naming-convention */

describe('createBlockedBlocksByDayMap()', () => {
  it('should work for empty case', () => {
    const r = createBlockedBlocksByDayMap([], [], [], undefined, undefined, 0);
    expect(r).toEqual({});
  });

  it('should work for basic case', () => {
    const r = createBlockedBlocksByDayMap(
      [],
      [],
      [],
      { startTime: '9:00', endTime: '17:00' },
      undefined,
      0,
      1,
    );
    expect(r).toEqual({
      '1970-01-01': [
        {
          end: 82800000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 115200000,
              start: 57600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 57600000,
        },
      ],
      '1970-01-02': [
        {
          end: 115200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 115200000,
              start: 57600000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 82800000,
        },
      ],
    } as any);
  });

  it('should work filter out entries beyond bounds', () => {});
});
