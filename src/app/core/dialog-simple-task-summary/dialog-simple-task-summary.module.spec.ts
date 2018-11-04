import { DialogSimpleTaskSummaryModule } from './dialog-simple-task-summary.module';

describe('DialogSimpleTaskSummaryModule', () => {
  let dialogSimpleTaskSummaryModule: DialogSimpleTaskSummaryModule;

  beforeEach(() => {
    dialogSimpleTaskSummaryModule = new DialogSimpleTaskSummaryModule();
  });

  it('should create an instance', () => {
    expect(dialogSimpleTaskSummaryModule).toBeTruthy();
  });
});
