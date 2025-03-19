import { getModelIdsToUpdateFromRevMaps } from './get-model-ids-to-update-from-rev-maps';
import { RevMap } from '../pfapi.model';

describe('getModelIdsToUpdateFromRevMaps', () => {
  it('should identify new models to update', () => {
    const revMapNewer: RevMap = {
      model1: 'rev1',
      model2: 'rev2',
    };
    const revMapToOverwrite: RevMap = {
      model1: 'rev1',
    };

    const result = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);

    expect(result.toUpdate).toContain('model2');
    expect(result.toUpdate.length).toBe(1);
    expect(result.toDelete.length).toBe(0);
  });

  it('should identify models with different revisions', () => {
    const revMapNewer: RevMap = {
      model1: 'rev2',
      model2: 'rev2',
    };
    const revMapToOverwrite: RevMap = {
      model1: 'rev1',
      model2: 'rev2',
    };

    const result = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);

    expect(result.toUpdate).toContain('model1');
    expect(result.toUpdate.length).toBe(1);
    expect(result.toDelete.length).toBe(0);
  });

  it('should identify models to delete', () => {
    const revMapNewer: RevMap = {
      model1: 'rev1',
    };
    const revMapToOverwrite: RevMap = {
      model1: 'rev1',
      model2: 'rev2',
    };

    const result = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);

    expect(result.toDelete).toContain('model2');
    expect(result.toDelete.length).toBe(1);
    expect(result.toUpdate.length).toBe(0);
  });

  it('should handle empty maps', () => {
    const revMapNewer: RevMap = {};
    const revMapToOverwrite: RevMap = {};

    const result = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);

    expect(result.toUpdate.length).toBe(0);
    expect(result.toDelete.length).toBe(0);
  });

  it('should handle complex scenario', () => {
    const revMapNewer: RevMap = {
      model1: 'rev1', // same
      model2: 'rev:new2', // changed
      model3: 'rev3', // new
      model5: 'rev5', // new
    };
    const revMapToOverwrite: RevMap = {
      model1: 'rev1', // same
      model2: 'rev:old2', // changed
      model4: 'rev4', // to delete
    };

    const result = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);

    expect(result.toUpdate).toContain('model2');
    expect(result.toUpdate).toContain('model3');
    expect(result.toUpdate).toContain('model5');
    expect(result.toUpdate.length).toBe(3);
    expect(result.toDelete).toContain('model4');
    expect(result.toDelete.length).toBe(1);
  });
});
