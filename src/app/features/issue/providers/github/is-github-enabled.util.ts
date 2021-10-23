import { GithubCfg } from './github.model';

export const isGithubEnabled = (cfg: GithubCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.repo;

export const isGithubEnabledLegacy = (cfg: GithubCfg): boolean => !!cfg && !!cfg.repo;
