import { OpenProjectOriginalWorkPackageReduced } from './open-project-api-responses';
import { truncate } from '../../../../util/truncate';

export const formatOpenProjectWorkPackageSubject = ({
  id,
  subject,
}: OpenProjectOriginalWorkPackageReduced): string => {
  return `#${id} ${subject}`;
};

export const formatOpenProjectWorkPackageSubjectForSnack = (
  workPackage: OpenProjectOriginalWorkPackageReduced,
): string => {
  return `${truncate(formatOpenProjectWorkPackageSubject(workPackage))}`;
};
