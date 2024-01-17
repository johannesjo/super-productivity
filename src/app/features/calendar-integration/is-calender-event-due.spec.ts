import { isCalenderEventDue } from './is-calender-event-due';
import { CalendarProvider } from '../config/global-config.model';

describe('isCalenderEventDue()', () => {
  it('should be true if event starts now', () => {
    expect(
      isCalenderEventDue(
        { id: 'CID', start: 5, title: 'T', duration: 1 },
        {
          showBannerBeforeThreshold: 0,
        } as CalendarProvider,
        [],
        5,
      ),
    ).toBe(true);
  });

  it('should be true if event starts within provider threshold', () => {
    expect(
      isCalenderEventDue(
        { id: 'CID', start: 5, title: 'T', duration: 1 },
        {
          showBannerBeforeThreshold: 2,
        } as CalendarProvider,
        [],
        3,
      ),
    ).toBe(true);
  });

  it('should be false if event starts outside the provider threshold', () => {
    expect(
      isCalenderEventDue(
        { id: 'CID', start: 5, title: 'T', duration: 1 },
        {
          showBannerBeforeThreshold: 2,
        } as CalendarProvider,
        [],
        1,
      ),
    ).toBe(false);
  });

  it('should be false if event has NOT started yet and there is NO provider threshold', () => {
    expect(
      isCalenderEventDue(
        { id: 'CID', start: 5, title: 'T', duration: 1 },
        {
          showBannerBeforeThreshold: null,
        } as CalendarProvider,
        [],
        4,
      ),
    ).toBe(false);
  });

  it('should be if false if event was skipped', () => {
    expect(
      isCalenderEventDue(
        { id: 'CID', start: 5, title: 'T', duration: 1 },
        {
          showBannerBeforeThreshold: 0,
        } as CalendarProvider,
        ['CID'],
        0,
      ),
    ).toBe(false);
  });

  it('should be if false if event is in the far future', () => {
    expect(
      isCalenderEventDue(
        { id: 'CID', start: 6, title: 'T', duration: 88 },
        {
          showBannerBeforeThreshold: 0,
        } as CalendarProvider,
        [],
        1,
      ),
    ).toBe(false);
  });
});
