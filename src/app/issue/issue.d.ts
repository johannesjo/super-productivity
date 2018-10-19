export interface IssueIntegrationCfg {
  isEnabled: boolean;
  host: string;
  userName: string;
  password?: string;
  token?: string;
}

export type IssueType = 'JIRA' | 'GIT';
