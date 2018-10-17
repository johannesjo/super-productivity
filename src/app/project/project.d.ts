import { IssueIntegrationCfg } from '../issue-integration/issue-integration';
import { JiraCfg } from '../issue-integration/jira/jira';

export type Project = Readonly<{
  title: string;
  id: string;
  themeColor: string;
  isDarkTheme: boolean;
  issueIntegrationCfgs: {
    jira: JiraCfg,
    git: IssueIntegrationCfg,
  };
}>;

