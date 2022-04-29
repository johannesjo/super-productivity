import { GiteaCfg } from './gitea.model';

export const isGiteaEnabled = (cfg: GiteaCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.host && !!cfg.token && !!cfg.repoFullname;
