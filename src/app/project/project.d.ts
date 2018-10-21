import { IssueIntegrationCfg } from '../issue/issue';
import { JiraCfg } from '../issue/jira/jira';

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GIT?: IssueIntegrationCfg;
}

export type Project = Readonly<{
  id: string;
  title: string;
  themeColor: string;
  isDarkTheme: boolean;
  issueIntegrationCfgs: IssueIntegrationCfgs;
}>;

