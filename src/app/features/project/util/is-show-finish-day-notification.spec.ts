import {isShowFinishDayNotification} from './is-show-finish-day-notification';

describe('isShowFinishDayNotification', () => {
  it('should be false if last lastCompletedDay === today', () => {
    const result = isShowFinishDayNotification(1569282725545, '2019-09-23', new Date(1569345197634));
    expect(result).toBe(false);
  });

  it('should be true if last workEnd < today && workEnd > lastCompletedDay', () => {
    const result = isShowFinishDayNotification(
      new Date('2019-09-20').getTime(),
      '2019-09-19',
      new Date('2019-09-21'),
    );
    expect(result).toBe(true);
  });

  it('should be false if last workEnd === today', () => {
    const result = isShowFinishDayNotification(
      new Date('2019-09-21').getTime(),
      '2019-09-19',
      new Date('2019-09-21'),
    );
    expect(result).toBe(false);
  });
});
