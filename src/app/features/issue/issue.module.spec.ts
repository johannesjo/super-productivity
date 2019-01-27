import { IssueModule } from './issue.module';

describe('IssueModule', () => {
  let issueModule: IssueModule;

  beforeEach(() => {
    issueModule = new IssueModule();
  });

  it('should create an instance', () => {
    expect(issueModule).toBeTruthy();
  });
});
