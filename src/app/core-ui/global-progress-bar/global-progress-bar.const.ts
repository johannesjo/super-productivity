export const PROGRESS_BAR_LABEL_MAP = {
  'asset/': 'Loading assets',

  'https://api.dropboxapi.com/2/files/get_metadata': 'Dropbox: Get file meta',
  'https://content.dropboxapi.com/2/files/download': 'Dropbox: Download file',
  'https://content.dropboxapi.com/2/files/upload': 'Dropbox: Upload file',
  'https://api.dropboxapi.com/oauth2/token': 'Dropbox: Generate token',

  'https://content.googleapis.com/upload/drive/': 'Google Drive: Upload file',
  'https://content.googleapis.com/drive/v2/files/': 'Google Drive: Download file',

  '/issues/': 'Github: Load issue data', // could also be Gitlab
  '/issue/': 'Jira: Load issue data',
};
