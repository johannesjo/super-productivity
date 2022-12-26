import { AzuredevopsCfg } from './azuredevops.model';

export const isAzuredevopsEnabled = (cfg: AzuredevopsCfg): boolean =>
  !!cfg && cfg.isEnabled && !!cfg.organization && !!cfg.project && !!cfg.token;

export const isAzuredevopsEnabledLegacy = (cfg: AzuredevopsCfg): boolean =>
  !!cfg && !!cfg.organization && !!cfg.project && !!cfg.token;
