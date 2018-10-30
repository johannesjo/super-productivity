import { IssueIntegrationCfg } from '../issue/issue';
import { JiraCfg } from '../issue/jira/jira';

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  GIT?: IssueIntegrationCfg;
}

export type RoundTimeOption = 'QUARTER' | 'HALF' | 'HOUR';

export type GoogleTimeSheetExportSettings = Readonly<{
  spreadsheetId: string,
  isAutoLogin: false,
  isAutoFocusEmpty: false,
  isRoundWorkTimeUp: boolean,
  roundStartTimeTo: RoundTimeOption,
  roundEndTimeTo: RoundTimeOption,
  roundWorkTimeTo: RoundTimeOption,
  defaultValues: string[]
}>;

export type Project = Readonly<{
  id: string;
  title: string;
  themeColor: string;
  isDarkTheme: boolean;
  issueIntegrationCfgs: IssueIntegrationCfgs;
  googleTimeSheetExportSettings: GoogleTimeSheetExportSettings;
}>;

