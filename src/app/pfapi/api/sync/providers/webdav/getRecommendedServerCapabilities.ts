import { WebdavServerCapabilities, WebdavServerType } from './webdav.model';

/**
 * Helper function to get recommended server capabilities for common WebDAV server types
 */
export const getRecommendedServerCapabilities = (
  serverType: WebdavServerType,
): WebdavServerCapabilities => {
  switch (serverType) {
    case WebdavServerType.NEXTCLOUD:
    case WebdavServerType.OWNCLOUD:
      return {
        supportsETags: true,
        supportsIfHeader: true,
        supportsLocking: true,
        supportsLastModified: true,
      };

    case WebdavServerType.APACHE_MOD_DAV:
      return {
        supportsETags: true,
        supportsIfHeader: false, // mod_dav has limited If header support
        supportsLocking: true,
        supportsLastModified: true,
      };

    case WebdavServerType.NGINX_DAV:
      return {
        supportsETags: false, // nginx dav module has limited ETag support
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true,
      };

    case WebdavServerType.BASIC_WEBDAV:
      return {
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true,
      };

    case WebdavServerType.CUSTOM:
    default:
      // Return null to trigger auto-detection
      return {
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: false,
      };
  }
};
