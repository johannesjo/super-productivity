import { CaldavCfg } from './caldav.model';

export const isCaldavEnabled = (cfg: CaldavCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.caldavUrl;

export const isCaldavEnabledLegacy = (cfg: CaldavCfg): boolean =>
  !!cfg && !!cfg.caldavUrl;
