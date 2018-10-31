import { HistoryAndCalendarModule } from './history-and-calendar.module';

describe('HistoryAndCalendarModule', () => {
  let historyAndCalendarModule: HistoryAndCalendarModule;

  beforeEach(() => {
    historyAndCalendarModule = new HistoryAndCalendarModule();
  });

  it('should create an instance', () => {
    expect(historyAndCalendarModule).toBeTruthy();
  });
});
