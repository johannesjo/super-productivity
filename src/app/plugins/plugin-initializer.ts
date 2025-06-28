import { Injector } from '@angular/core';
import { PluginService } from './plugin.service';

/**
 * Modern Angular initialization function for plugins
 * To be called during application bootstrap with the app injector
 */
export const initializePlugins = async (injector: Injector): Promise<void> => {
  const pluginService = injector.get(PluginService);
  await pluginService.initializePlugins();
};

/**
 * Provider for plugin initialization
 */
export const PLUGIN_INITIALIZER_PROVIDER = {
  provide: 'PLUGIN_INITIALIZER',
  useFactory: () => initializePlugins,
  multi: true,
};
