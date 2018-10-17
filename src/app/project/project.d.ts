import { IssueIntegrationCfg } from '../issue/issue';
import { JiraCfg } from '../issue/jira/jira';

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

