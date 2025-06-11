import { APP_INITIALIZER } from '@angular/core';
import { PluginService } from './plugin.service';

export const pluginInitializerFactory = (
  pluginService: PluginService,
): (() => Promise<void>) => {
  return () => pluginService.initializePlugins();
};

export const PLUGIN_INITIALIZER_PROVIDER = {
  provide: APP_INITIALIZER,
  useFactory: pluginInitializerFactory,
  deps: [PluginService],
  multi: true,
};
