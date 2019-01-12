import { GitIssueModule } from './git-issue.module';

describe('GitIssuesModule', () => {
  let gitIssuesModule: GitIssueModule;

  beforeEach(() => {
    gitIssuesModule = new GitIssueModule();
  });

  it('should create an instance', () => {
    expect(gitIssuesModule).toBeTruthy();
  });
});
