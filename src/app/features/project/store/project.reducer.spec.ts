import { projectReducer } from './project.reducer';
import { fakeEntityStateFromArray } from '../../../util/fake-entity-state-from-array';
import { Project } from '../project.model';
import { UpdateProjectOrder } from './project.actions';

describe('projectReducer', () => {
  describe('UpdateProjectOrder', () => {
    it('Should re-add archived projects if incomplete list is given as param', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: true },
      ] as Partial<Project>[]);

      const ids = ['B', 'A'];
      const r = projectReducer(s as any, new UpdateProjectOrder({ ids }));
      expect(r.ids).toEqual(['B', 'A', 'C']);
    });

    it('Should throw an error for inconsistent data', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: false },
      ] as Partial<Project>[]);
      const ids = ['B', 'A'];
      expect(() => {
        projectReducer(s as any, new UpdateProjectOrder({ ids }));
      }).toThrowError('Invalid param given to UpdateProjectOrder');
    });

    it('Should work with correct params', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: true },
      ] as Partial<Project>[]);
      const ids = ['B', 'A', 'C'];
      const r = projectReducer(s as any, new UpdateProjectOrder({ ids }));
      expect(r.ids).toEqual(['B', 'A', 'C']);
    });

    it('Should work with all unarchived projects', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: false },
      ] as Partial<Project>[]);

      const ids = ['B', 'A', 'C'];
      const r = projectReducer(s as any, new UpdateProjectOrder({ ids }));
      expect(r.ids).toEqual(['B', 'A', 'C']);
    });

    it('Should allow sorting of archived ids as well', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: true },
        { id: 'D', isArchived: true },
      ] as Partial<Project>[]);

      const ids = ['D', 'C'];
      const r = projectReducer(s as any, new UpdateProjectOrder({ ids }));
      expect(r.ids).toEqual(['A', 'B', 'D', 'C']);
    });
  });
});
