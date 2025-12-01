import {
  OpenProjectOriginalWorkPackageFull,
  OpenProjectOriginalWorkPackageReduced,
} from './open-project-api-responses';

export interface OpenProjectAttachment {
  id: number;
  fileName: string;
  fileSize: number;
  description: string;
  contentType: string;
  _links: {
    self: { href: string };
    downloadLocation: { href: string };
    // And potentially other relevant links
  };
}

export type OpenProjectWorkPackageReduced = OpenProjectOriginalWorkPackageReduced &
  Readonly<{
    // added
    // transformed
    url: string;
    // removed
    attachments?: OpenProjectAttachment[];
  }>;

export type OpenProjectWorkPackage = OpenProjectWorkPackageReduced &
  OpenProjectOriginalWorkPackageFull &
  Readonly<{
    attachments?: OpenProjectAttachment[];
  }>;
