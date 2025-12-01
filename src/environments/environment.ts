// This file is the default environment configuration for development
import pkg from '../../package.json';

export const environment = {
  production: false,
  stage: false,
  version: pkg.version,
};
