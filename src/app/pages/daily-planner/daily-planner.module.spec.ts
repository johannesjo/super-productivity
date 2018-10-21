import { DailyPlannerModule } from './daily-planner.module';

describe('DailyPlannerModule', () => {
  let dailyPlannerModule: DailyPlannerModule;

  beforeEach(() => {
    dailyPlannerModule = new DailyPlannerModule();
  });

  it('should create an instance', () => {
    expect(dailyPlannerModule).toBeTruthy();
  });
});
