import { JiraCfg } from './jira.model';

export const isJiraEnabled = (cfg: JiraCfg) => cfg && cfg.isEnabled;
