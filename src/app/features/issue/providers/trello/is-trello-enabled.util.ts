import { TrelloCfg } from './trello.model';

export const isTrelloEnabled = (cfg: TrelloCfg): boolean => cfg.isEnabled;
