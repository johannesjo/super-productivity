import { IssueIntegrationCfg } from '../issue-integration/issue-integration';

export type ProjectCfg = Readonly<{
  issueIntegrationCfgs: {
    [key: string]: IssueIntegrationCfg[]
  };
}>;
