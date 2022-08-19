import { RedmineCfg } from './redmine.model';

export const isRedmineEnabled = (cfg: RedmineCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.host && !!cfg.api_key && !!cfg.projectId;
