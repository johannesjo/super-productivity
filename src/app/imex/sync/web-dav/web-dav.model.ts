// TODO throws compile error :(
// import { FileStat } from 'webdav/web/types';
/* eslint-disable @typescript-eslint/naming-convention */

import { IncomingHttpHeaders } from 'http';

export interface FileStat {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  etag: string | null;
  mime?: string;
  props?: unknown;
}

export interface WebDavHeadResponse extends IncomingHttpHeaders {
  'oc-etag'?: string;
  // [key: string]: any;
}
