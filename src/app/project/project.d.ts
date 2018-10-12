import { IssueIntegrationCfg } from '../issue-integration/issue-integration';

export interface ProjectCfg {
  IssueIntegrationCfgs: {
    [key: string]: IssueIntegrationCfg[]
  };
}