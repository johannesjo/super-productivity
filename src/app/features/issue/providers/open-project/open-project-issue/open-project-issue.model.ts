import { OpenProjectOriginalWorkPackage } from '../open-project-api-responses';

export type OpenProjectWorkPackageReduced = OpenProjectOriginalWorkPackage &
  Readonly<{
    // added
    // transformed
    url: string;
    // removed
  }>;

export type OpenProjectWorkPackage = OpenProjectWorkPackageReduced;
