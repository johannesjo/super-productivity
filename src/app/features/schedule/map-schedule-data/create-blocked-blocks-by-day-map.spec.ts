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
      2,
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
        {
          end: 169200000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 201600000,
              start: 144000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 144000000,
        },
      ],
      '1970-01-03': [
        {
          end: 201600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 201600000,
              start: 144000000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 169200000,
        },
        {
          end: 255600000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 288000000,
              start: 230400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 230400000,
        },
      ],
      '1970-01-04': [
        {
          end: 288000000,
          entries: [
            {
              data: { endTime: '17:00', startTime: '9:00' },
              end: 288000000,
              start: 230400000,
              type: 'WorkdayStartEnd',
            },
          ],
          start: 255600000,
        },
      ],
    } as any);
  });

  it('should work filter out entries beyond bounds', () => {});
});
