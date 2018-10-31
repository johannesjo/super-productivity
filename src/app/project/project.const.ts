import { Project } from './project.model';

export const DEFAULT_PROJECT: Project = {
  id: null,
  title: '',
  themeColor: '',
  isDarkTheme: false,
  issueIntegrationCfgs: {},
  googleTimeSheetExport: {
    spreadsheetId: null,
    isAutoLogin: false,
    isAutoFocusEmpty: false,
    isRoundWorkTimeUp: null,
    roundStartTimeTo: null,
    roundEndTimeTo: null,
    roundWorkTimeTo: null,
    lastExported: null,
    defaultValues: [
      '{date}',
      '{startTime}',
      '{currentTime}',
      '{totalTime}',
    ]
  }
};

export const FIRST_PROJECT: Project = {
  id: 'DEFAULT',
  title: 'Super Productivity',
  themeColor: 'light-blue',
  isDarkTheme: false,
  issueIntegrationCfgs: {},
  googleTimeSheetExport: {
    spreadsheetId: null,
    isAutoLogin: false,
    isAutoFocusEmpty: false,
    isRoundWorkTimeUp: null,
    roundStartTimeTo: null,
    roundEndTimeTo: null,
    roundWorkTimeTo: null,
    defaultValues: [],
    lastExported: null,
  }
};
