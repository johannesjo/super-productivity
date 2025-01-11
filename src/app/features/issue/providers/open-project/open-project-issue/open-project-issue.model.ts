import {
  OpenProjectOriginalWorkPackageFull,
  OpenProjectOriginalWorkPackageReduced,
} from '../open-project-api-responses';

export type OpenProjectWorkPackageReduced = OpenProjectOriginalWorkPackageReduced &
  Readonly<{
    // added
    // transformed
    url: string;
    // removed
  }>;

export type OpenProjectWorkPackage = OpenProjectWorkPackageReduced &
  OpenProjectOriginalWorkPackageFull;
