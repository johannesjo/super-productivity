import {
  OpenProjectOriginalWorkPackageFull,
  OpenProjectOriginalWorkPackageReduced,
} from '../open-project-api-responses';

export type OpenProjectWorkPackageReduced = OpenProjectOriginalWorkPackageReduced &
  Readonly<{
    // added
    // transformed
    plannedAt: string | null;
    url: string;
    // removed
  }>;

export type OpenProjectWorkPackage = OpenProjectWorkPackageReduced &
  OpenProjectOriginalWorkPackageFull;
