/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavPrivateCfg } from './webdav';

export const createMockResponse = (
  status: number,
  headers: Record<string, string> = {},
  body: string = '',
): Response => {
  // 204 No Content and 304 Not Modified responses can't have a body
  const responseBody = [204, 304].includes(status) ? null : body;
  const response = new Response(responseBody, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
  });
  return response;
};

export const mockCfg: WebdavPrivateCfg = {
  baseUrl: 'https://webdav.example.com',
  userName: 'testuser',
  password: 'testpass',
  syncFolderPath: '/sync',
};

export const createPropfindResponse = (
  href: string,
  props: Record<string, any>,
  status = 200,
): string => {
  const propElements = Object.entries(props)
    .map(([key, value]) => {
      if (key === 'resourcetype' && value === 'collection') {
        return `<d:resourcetype><d:collection/></d:resourcetype>`;
      }
      return `<d:${key}>${value}</d:${key}>`;
    })
    .join('\n            ');

  return `<?xml version="1.0" encoding="utf-8"?>
    <d:multistatus xmlns:d="DAV:">
      <d:response>
        <d:href>${href}</d:href>
        <d:propstat>
          <d:prop>
            ${propElements}
          </d:prop>
          <d:status>HTTP/1.1 ${status} ${status === 200 ? 'OK' : 'Error'}</d:status>
        </d:propstat>
      </d:response>
    </d:multistatus>`;
};

export const createMultiStatusResponse = (
  responses: Array<{ href: string; props: Record<string, any>; status?: number }>,
): string => {
  const responseElements = responses
    .map((resp) => {
      const propElements = Object.entries(resp.props)
        .map(([key, value]) => {
          if (key === 'resourcetype' && value === 'collection') {
            return `<d:resourcetype><d:collection/></d:resourcetype>`;
          }
          return `<d:${key}>${value}</d:${key}>`;
        })
        .join('\n            ');

      return `
      <d:response>
        <d:href>${resp.href}</d:href>
        <d:propstat>
          <d:prop>
            ${propElements}
          </d:prop>
          <d:status>HTTP/1.1 ${resp.status || 200} ${
            resp.status === 200 || !resp.status ? 'OK' : 'Error'
          }</d:status>
        </d:propstat>
      </d:response>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
    <d:multistatus xmlns:d="DAV:">${responseElements}
    </d:multistatus>`;
};
