import { GitlabCfg } from './gitlab';

export const isGitlabEnabled = (gitlabCfg: GitlabCfg): boolean =>
  !!gitlabCfg && !!gitlabCfg.project;
