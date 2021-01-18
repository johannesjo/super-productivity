/* eslint-disable max-len */
export interface GoogleDriveFileMeta {
  /**
   * A collection of arbitrary key-value pairs which are private to the requesting app. Entries with null values are cleared in update and copy requests.
   */
  appProperties?: { [key: string]: string } | null;
  /**
   * Capabilities the current user has on this file. Each capability corresponds to a fine-grained action that a user may take.
   */
  capabilities?: {
    canAddChildren?: boolean;
    canAddFolderFromAnotherDrive?: boolean;
    canAddMyDriveParent?: boolean;
    canChangeCopyRequiresWriterPermission?: boolean;
    canChangeViewersCanCopyContent?: boolean;
    canComment?: boolean;
    canCopy?: boolean;
    canDelete?: boolean;
    canDeleteChildren?: boolean;
    canDownload?: boolean;
    canEdit?: boolean;
    canListChildren?: boolean;
    canModifyContent?: boolean;
    canModifyContentRestriction?: boolean;
    canMoveChildrenOutOfDrive?: boolean;
    canMoveChildrenOutOfTeamDrive?: boolean;
    canMoveChildrenWithinDrive?: boolean;
    canMoveChildrenWithinTeamDrive?: boolean;
    canMoveItemIntoTeamDrive?: boolean;
    canMoveItemOutOfDrive?: boolean;
    canMoveItemOutOfTeamDrive?: boolean;
    canMoveItemWithinDrive?: boolean;
    canMoveItemWithinTeamDrive?: boolean;
    canMoveTeamDriveItem?: boolean;
    canReadDrive?: boolean;
    canReadRevisions?: boolean;
    canReadTeamDrive?: boolean;
    canRemoveChildren?: boolean;
    canRemoveMyDriveParent?: boolean;
    canRename?: boolean;
    canShare?: boolean;
    canTrash?: boolean;
    canTrashChildren?: boolean;
    canUntrash?: boolean;
  } | null;
  /**
   * Additional information about the content of the file. These fields are never populated in responses.
   */
  contentHints?: {
    indexableText?: string;
    thumbnail?: { image?: string; mimeType?: string };
  } | null;
  /**
   * Restrictions for accessing the content of the file. Only populated if such a restriction exists.
   */
  contentRestrictions?: unknown[];
  /**
   * Whether the options to copy, print, or download this file, should be disabled for readers and commenters.
   */
  copyRequiresWriterPermission?: boolean | null;
  /**
   * The time at which the file was created (RFC 3339 date-time).
   */
  createdTime?: string | null;
  /**
   * A short description of the file.
   */
  description?: string | null;
  /**
   * ID of the shared drive the file resides in. Only populated for items in shared drives.
   */
  driveId?: string | null;
  /**
   * Whether the file has been explicitly trashed, as opposed to recursively trashed from a parent folder.
   */
  explicitlyTrashed?: boolean | null;
  /**
   * Links for exporting Google Docs to specific formats.
   */
  exportLinks?: { [key: string]: string } | null;
  /**
   * The final component of fullFileExtension. This is only available for files with binary content in Google Drive.
   */
  fileExtension?: string | null;
  /**
   * The color for a folder as an RGB hex string. The supported colors are published in the folderColorPalette field of the About resource. If an unsupported color is specified, the closest color in the palette will be used instead.
   */
  folderColorRgb?: string | null;
  /**
   * The full file extension extracted from the name field. May contain multiple concatenated extensions, such as &quot;tar.gz&quot;. This is only available for files with binary content in Google Drive. This is automatically updated when the name field changes, however it is not cleared if the new name does not contain a valid extension.
   */
  fullFileExtension?: string | null;
  /**
   * Whether there are permissions directly on this file. This field is only populated for items in shared drives.
   */
  hasAugmentedPermissions?: boolean | null;
  /**
   * Whether this file has a thumbnail. This does not indicate whether the requesting app has access to the thumbnail. To check access, look for the presence of the thumbnailLink field.
   */
  hasThumbnail?: boolean | null;
  /**
   * The ID of the file&#39;s head revision. This is currently only available for files with binary content in Google Drive.
   */
  headRevisionId?: string | null;
  /**
   * A static, unauthenticated link to the file&#39;s icon.
   */
  iconLink?: string | null;
  /**
   * The ID of the file.
   */
  id?: string | null;
  /**
   * Additional metadata about image media, if available.
   */
  imageMediaMetadata?: {
    aperture?: number;
    cameraMake?: string;
    cameraModel?: string;
    colorSpace?: string;
    exposureBias?: number;
    exposureMode?: string;
    exposureTime?: number;
    flashUsed?: boolean;
    focalLength?: number;
    height?: number;
    isoSpeed?: number;
    lens?: string;
    location?: { altitude?: number; latitude?: number; longitude?: number };
    maxApertureValue?: number;
    meteringMode?: string;
    rotation?: number;
    sensor?: string;
    subjectDistance?: number;
    time?: string;
    whiteBalance?: string;
    width?: number;
  } | null;
  /**
   * Whether the file was created or opened by the requesting app.
   */
  isAppAuthorized?: boolean | null;
  /**
   * Identifies what kind of resource this is. Value: the fixed string &quot;drive#file&quot;.
   */
  kind?: string | null;
  /**
   * The last user to modify the file.
   */
  lastModifyingUser?: unknown;
  /**
   * The MD5 checksum for the content of the file. This is only applicable to files with binary content in Google Drive.
   */
  md5Checksum?: string | null;
  /**
   * The MIME type of the file. Google Drive will attempt to automatically detect an appropriate value from uploaded content if no value is provided. The value cannot be changed unless a new revision is uploaded. If a file is created with a Google Doc MIME type, the uploaded content will be imported if possible. The supported import formats are published in the About resource.
   */
  mimeType?: string | null;
  /**
   * Whether the file has been modified by this user.
   */
  modifiedByMe?: boolean | null;
  /**
   * The last time the file was modified by the user (RFC 3339 date-time).
   */
  modifiedByMeTime?: string | null;
  /**
   * The last time the file was modified by anyone (RFC 3339 date-time). Note that setting modifiedTime will also update modifiedByMeTime for the user.
   */
  modifiedTime?: string | null;
  /**
   * The name of the file. This is not necessarily unique within a folder. Note that for immutable items such as the top level folders of shared drives, My Drive root folder, and Application Data folder the name is constant.
   */
  name?: string | null;
  /**
   * The original filename of the uploaded content if available, or else the original value of the name field. This is only available for files with binary content in Google Drive.
   */
  originalFilename?: string | null;
  /**
   * Whether the user owns the file. Not populated for items in shared drives.
   */
  ownedByMe?: boolean | null;
  /**
   * The owners of the file. Currently, only certain legacy files may have more than one owner. Not populated for items in shared drives.
   */
  owners?: unknown[];
  /**
   * The IDs of the parent folders which contain the file. If not specified as part of a create request, the file will be placed directly in the user&#39;s My Drive folder. If not specified as part of a copy request, the file will inherit any discoverable parents of the source file. Update requests must use the addParents and removeParents parameters to modify the parents list.
   */
  parents?: string[] | null;
  /**
   * List of permission IDs for users with access to this file.
   */
  permissionIds?: string[] | null;
  /**
   * The full list of permissions for the file. This is only available if the requesting user can share the file. Not populated for items in shared drives.
   */
  permissions?: unknown[];
  /**
   * A collection of arbitrary key-value pairs which are visible to all apps. Entries with null values are cleared in update and copy requests.
   */
  properties?: { [key: string]: string } | null;
  /**
   * The number of storage quota bytes used by the file. This includes the head revision as well as previous revisions with keepForever enabled.
   */
  quotaBytesUsed?: string | null;
  /**
   * Whether the file has been shared. Not populated for items in shared drives.
   */
  shared?: boolean | null;
  /**
   * The time at which the file was shared with the user, if applicable (RFC 3339 date-time).
   */
  sharedWithMeTime?: string | null;
  /**
   * The user who shared the file with the requesting user, if applicable.
   */
  sharingUser?: unknown;
  /**
   * Shortcut file details. Only populated for shortcut files, which have the mimeType field set to application/vnd.google-apps.shortcut.
   */
  shortcutDetails?: { targetId?: string; targetMimeType?: string } | null;
  /**
   * The size of the file&#39;s content in bytes. This is only applicable to files with binary content in Google Drive.
   */
  size?: string | null;
  /**
   * The list of spaces which contain the file. The currently supported values are &#39;drive&#39;, &#39;appDataFolder&#39; and &#39;photos&#39;.
   */
  spaces?: string[] | null;
  /**
   * Whether the user has starred the file.
   */
  starred?: boolean | null;
  /**
   * Deprecated - use driveId instead.
   */
  teamDriveId?: string | null;
  /**
   * A short-lived link to the file&#39;s thumbnail, if available. Typically lasts on the order of hours. Only populated when the requesting app can access the file&#39;s content.
   */
  thumbnailLink?: string | null;
  /**
   * The thumbnail version for use in thumbnail cache invalidation.
   */
  thumbnailVersion?: string | null;
  /**
   * Whether the file has been trashed, either explicitly or from a trashed parent folder. Only the owner may trash a file. The trashed item is excluded from all files.list responses returned for any user who does not own the file. However, all users with access to the file can see the trashed item metadata in an API response. All users with access can copy, download, export, and share the file.
   */
  trashed?: boolean | null;
  /**
   * The time that the item was trashed (RFC 3339 date-time). Only populated for items in shared drives.
   */
  trashedTime?: string | null;
  /**
   * If the file has been explicitly trashed, the user who trashed it. Only populated for items in shared drives.
   */
  trashingUser?: unknown;
  /**
   * A monotonically increasing version number for the file. This reflects every change made to the file on the server, even those not visible to the user.
   */
  version?: string | null;
  /**
   * Additional metadata about video media. This may not be available immediately upon upload.
   */
  videoMediaMetadata?: {
    durationMillis?: string;
    height?: number;
    width?: number;
  } | null;
  /**
   * Whether the file has been viewed by this user.
   */
  viewedByMe?: boolean | null;
  /**
   * The last time the file was viewed by the user (RFC 3339 date-time).
   */
  viewedByMeTime?: string | null;
  /**
   * Deprecated - use copyRequiresWriterPermission instead.
   */
  viewersCanCopyContent?: boolean | null;
  /**
   * A link for downloading the content of the file in a browser. This is only available for files with binary content in Google Drive.
   */
  webContentLink?: string | null;
  /**
   * A link for opening the file in a relevant Google editor or viewer in a browser.
   */
  webViewLink?: string | null;
  /**
   * Whether users with only writer permission can modify the file&#39;s permissions. Not populated for items in shared drives.
   */
  writersCanShare?: boolean | null;
}
