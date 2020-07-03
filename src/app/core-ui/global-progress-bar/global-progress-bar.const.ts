import { T } from '../../t.const';

export const PROGRESS_BAR_LABEL_MAP: { [key: string]: string } = {
  'asset/': T.GPB.ASSETS,

  'https://api.dropboxapi.com/2/files/get_metadata': T.GPB.DBX_META,
  'https://content.dropboxapi.com/2/files/download': T.GPB.DBX_DOWNLOAD,
  'https://content.dropboxapi.com/2/files/upload': T.GPB.DBX_UPLOAD,
  'https://api.dropboxapi.com/oauth2/token': T.GPB.DBX_GEN_TOKEN,

  'https://content.googleapis.com/upload/drive/': T.GPB.GDRIVE_UPLOAD,
  'https://content.googleapis.com/drive/v2/files/': T.GPB.GDRIVE_DOWNLOAD,

  '/issues/': T.GPB.GITHUB_LOAD_ISSUE,
  '/issue/': T.GPB.JIRA_LOAD_ISSUE,
};
