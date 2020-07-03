import { GithubCfg } from './github.model';

export const isGithubEnabled = (cfg: GithubCfg): boolean => !!cfg && !!cfg.repo;
