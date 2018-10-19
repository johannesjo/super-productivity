import { Project } from './project';

export const DEFAULT_PROJECT: Partial<Project> = {
  title: '',
  themeColor: '',
  isDarkTheme: false,
  issueIntegrationCfgs: {},
};

export const FIRST_PROJECT: Project = {
  id: 'DEFAULT',
  title: 'Super Productivity',
  themeColor: 'light-blue',
  isDarkTheme: false,
  issueIntegrationCfgs: {}
};
