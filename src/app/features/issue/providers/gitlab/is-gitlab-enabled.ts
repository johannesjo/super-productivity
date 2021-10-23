import { GitlabCfg } from './gitlab';

export const isGitlabEnabled = (gitlabCfg: GitlabCfg): boolean =>
  !!gitlabCfg && gitlabCfg.isEnabled && !!gitlabCfg.project;

export const isGitlabEnabledLegacy = (gitlabCfg: GitlabCfg): boolean =>
  !!gitlabCfg && !!gitlabCfg.project;
