import { TasksModule } from './tasks.module';

describe('TasksModule', () => {
  let tasksModule: TasksModule;

  beforeEach(() => {
    tasksModule = new TasksModule();
  });

  it('should create an instance', () => {
    expect(tasksModule).toBeTruthy();
  });
});
