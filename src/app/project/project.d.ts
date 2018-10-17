import { IssueIntegrationCfg } from '../issue-integration/issue-integration';

export type Project = Readonly<{
  title: string;
  id: string;
  themeColor: string;
  isDarkTheme: boolean;
  issueIntegrationCfgs: {
    [key: string]: IssueIntegrationCfg[]
  };
}>;

