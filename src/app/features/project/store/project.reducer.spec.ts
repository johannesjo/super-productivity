import { projectReducer } from './project.reducer';
import { fakeEntityStateFromArray } from '../../../util/fake-entity-state-from-array';
import { Project } from '../project.model';
import { updateProjectOrder } from './project.actions';
import { moveNoteToOtherProject } from '../../note/store/note.actions';
import { INBOX_PROJECT } from '../project.const';

describe('projectReducer', () => {
  describe('UpdateProjectOrder', () => {
    it('Should re-add archived projects if incomplete list is given as param', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: INBOX_PROJECT.id, isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: true },
      ] as Partial<Project>[]);

      const ids = ['B', 'A'];
      const r = projectReducer(s as any, updateProjectOrder({ ids }) as any);
      expect(r.ids).toEqual([INBOX_PROJECT.id, 'B', 'A', 'C']);
    });

    it('Should throw an error for inconsistent data', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: false },
      ] as Partial<Project>[]);
      const ids = ['B', 'A'];
      expect(() => {
        projectReducer(s as any, updateProjectOrder({ ids }) as any);
      }).toThrowError('Invalid param given to UpdateProjectOrder');
    });

    it('Should work with correct params', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: true },
      ] as Partial<Project>[]);
      const ids = ['B', 'A', 'C'];
      const r = projectReducer(s as any, updateProjectOrder({ ids }) as any);
      expect(r.ids).toEqual(['B', 'A', 'C']);
    });

    it('Should work with all unarchived projects', () => {
      const s = fakeEntityStateFromArray([
        { id: 'A', isArchived: false },
        { id: 'B', isArchived: false },
        { id: 'C', isArchived: false },
      ] as Partial<Project>[]);

      const ids = ['B', 'A', 'C'];
      const r = projectReducer(s as any, updateProjectOrder({ ids }) as any);
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
      const r = projectReducer(s as any, updateProjectOrder({ ids }) as any);
      expect(r.ids).toEqual(['A', 'B', 'D', 'C']);
    });
  });

  describe('moveNoteToOtherProject', () => {
    it('should update project note list accordingly', () => {
      const s = fakeEntityStateFromArray([
        { id: 'P1', noteIds: ['A', 'B'] },
        { id: 'P2', noteIds: ['C'] },
      ] as Partial<Project>[]);

      const r = projectReducer(
        s as any,
        moveNoteToOtherProject({
          note: {
            id: 'A',
            projectId: 'P1',
          } as any,
          targetProjectId: 'P2',
        }) as any,
      );
      expect((r.entities as any).P1.noteIds).toEqual(['B']);
      expect((r.entities as any).P2.noteIds).toEqual(['C', 'A']);
    });

    it('should update project note list correctly for no project notes', () => {
      const s = fakeEntityStateFromArray([
        { id: 'P1', noteIds: ['A', 'B'] },
        { id: 'P2', noteIds: ['C'] },
      ] as Partial<Project>[]);

      const r = projectReducer(
        s as any,
        moveNoteToOtherProject({
          note: {
            id: 'NEW',
            projectId: null,
          } as any,
          targetProjectId: 'P2',
        }) as any,
      );
      expect((r.entities as any).P1.noteIds).toEqual(['A', 'B']);
      expect((r.entities as any).P2.noteIds).toEqual(['C', 'NEW']);
    });
  });
});
