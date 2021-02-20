import { CaldavCfg } from './caldav.model';

export const isCaldavEnabled = (cfg: CaldavCfg): boolean => !!cfg && !!cfg.caldavUrl;
