import { OpenProjectCfg } from './open-project.model';

export const isOpenProjectEnabled = (cfg: OpenProjectCfg): boolean =>
  !!cfg && !!cfg.host && !!cfg.token && !!cfg.projectId;
