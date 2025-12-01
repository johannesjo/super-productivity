import { OpenProjectCfg } from './open-project.model';

export const isOpenProjectEnabled = (cfg: OpenProjectCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.host && !!cfg.token && !!cfg.projectId;
