import {GithubCfg} from './github.model';

export const isGithubEnabled = (cfg: GithubCfg) => cfg && cfg.repo;
