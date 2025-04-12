'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.environment = void 0;
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
var package_json_1 = require('../../package.json');
exports.environment = {
  production: false,
  stage: false,
  version: package_json_1.default.version,
};
/*
 * In development mode, for easier debugging, you can ignore zone related error
 * stack frames such as `zone.run`/`zoneDelegate.invokeTask` by importing the
 * below file. Don't forget to comment it out in production mode
 * because it will have a performance impact when errors are thrown
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
//# sourceMappingURL=environment.js.map
