import { JiraModule } from './jira.module';

describe('JiraModule', () => {
  let jiraModule: JiraModule;

  beforeEach(() => {
    jiraModule = new JiraModule();
  });

  it('should create an instance', () => {
    expect(jiraModule).toBeTruthy();
  });
});
