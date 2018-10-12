export interface IssueIntegrationCfgConst {
  providerKey: string;
}

export interface IssueIntegrationCfg extends IssueIntegrationCfgConst {
  userName: string;
  password?: string;
  token?: string;
  settings: Object;
}
