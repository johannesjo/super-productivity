import { IssueIntegrationCfg } from '../issue-integration/issue-integration';

export type ProjectCfg = Readonly<{
  issueIntegrationCfgs: {
    [key: string]: IssueIntegrationCfg[]
  };
}>;

export type Project = Readonly<{
  title: string;
  id: string;
  themeColor: string;
  isDarkTheme: boolean;
  cfg: ProjectCfg;
}>;

