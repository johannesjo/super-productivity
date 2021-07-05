import pkg from '../../package.json';

export const environment = {
  production: false,
  stage: true,
  version: pkg.version,
};
