import { WorkViewModule } from './work-view.module';

describe('WorkViewModule', () => {
  let workViewModule: WorkViewModule;

  beforeEach(() => {
    workViewModule = new WorkViewModule();
  });

  it('should create an instance', () => {
    expect(workViewModule).toBeTruthy();
  });
});
