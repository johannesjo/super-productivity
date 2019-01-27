import { SimpleTaskSummaryModule } from '../simple-task-summary.module';

describe('SimpleTaskSummaryModule', () => {
  let dialogSimpleTaskSummaryModule: SimpleTaskSummaryModule;

  beforeEach(() => {
    dialogSimpleTaskSummaryModule = new SimpleTaskSummaryModule();
  });

  it('should create an instance', () => {
    expect(dialogSimpleTaskSummaryModule).toBeTruthy();
  });
});
