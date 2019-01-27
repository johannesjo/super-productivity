import { DailySummaryModule } from './daily-summary.module';

describe('DailySummaryModule', () => {
  let dailySummaryModule: DailySummaryModule;

  beforeEach(() => {
    dailySummaryModule = new DailySummaryModule();
  });

  it('should create an instance', () => {
    expect(dailySummaryModule).toBeTruthy();
  });
});
