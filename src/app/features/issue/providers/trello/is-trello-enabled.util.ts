import { TrelloCfg } from './trello.model';

export const isTrelloEnabled = (cfg: TrelloCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.apiKey && !!cfg.token && !!cfg.boardId;
