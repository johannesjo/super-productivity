export const GOOGLE_SETTINGS_WEB = {
  CLIENT_ID: '37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com',
  API_KEY: 'AIzaSyBqr3r5B5QGb_drLTK8_q9HW7YUez83Bik',
};
export const GOOGLE_SETTINGS_ELECTRON = {
  CLIENT_ID: '37646582031-qo0kc0p6amaukfd5ub16hhp6f8smrk1n.apps.googleusercontent.com',
  API_KEY: 'Er6sAwgXCDKPgw7y8jSuQQTv',
};

export const GOOGLE_DISCOVERY_DOCS = [];

export const GOOGLE_API_SCOPES_ARRAY = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.install',
];
export const GOOGLE_API_SCOPES = GOOGLE_API_SCOPES_ARRAY.join(' ');

export const GOOGLE_DEFAULT_FIELDS_FOR_DRIVE =
  'id,title,mimeType,md5Checksum,userPermission,editable,modifiedDate,shared,createdDate,fileSize,downloadUrl,exportLinks,webContentLink';

export const DEFAULT_SYNC_FILE_NAME = 'SUPER_PRODUCTIVITY_SYNC.json';
