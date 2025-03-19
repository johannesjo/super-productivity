import { RevMap } from '../pfapi.model';
import { cleanRev } from './clean-rev';

// TODO test
export const getModelIdsToUpdateFromRevMaps = (
  revMapNewer: RevMap,
  revMapToOverwrite: RevMap,
): { toUpdate: string[]; toDelete: string[] } => {
  const toUpdate: string[] = Object.keys(revMapNewer).filter(
    (modelId) =>
      !revMapToOverwrite[modelId] ||
      cleanRev(revMapNewer[modelId]) !== cleanRev(revMapToOverwrite[modelId]),
  );
  const toDelete: string[] = Object.keys(revMapToOverwrite).filter(
    (modelId) => !revMapNewer[modelId],
  );

  return { toUpdate, toDelete };
};
