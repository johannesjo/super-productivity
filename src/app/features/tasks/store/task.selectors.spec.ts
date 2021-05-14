import { selectTimelineTasks } from './task.selectors';
import { TODAY_TAG } from '../../tag/tag.const';
import { fakeEntityStateFromArray } from '../../../util/fake-entity-state-from-array';

describe('taskSelectors', () => {
  describe('selectTimelineTasks', () => {
    it('should split into planned and unplanned tasks', () => {
      const P1 = {
        id: 'P1',
        tagIds: [TODAY_TAG.id],
        subTaskIds: [],
      };
      const P2 = {
        id: 'P2',
        subTaskIds: [],
        tagIds: [TODAY_TAG.id],
        plannedAt: 1234,
        reminderId: 'asd',
      };
      const initialState = fakeEntityStateFromArray([P1, P2]) as any;
      const result = selectTimelineTasks.projector(initialState);
      expect(result).toEqual({
        unPlanned: [P1],
        planned: [P2],
      } as any);
    });

    it('should split sub tasks', () => {
      const P = {
        id: 'P',
        subTaskIds: ['SUB1', 'SUB_S'],
        tagIds: [TODAY_TAG.id],
      };
      const SUB1 = {
        id: 'SUB1',
        subTaskIds: [],
        tagIds: [],
        parentId: P.id,
      };
      const SUB_S = {
        id: 'SUB_S',
        plannedAt: 1234,
        reminderId: 'HA',
        parentId: P.id,
        subTaskIds: [],
        tagIds: [],
      };

      const initialState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector(initialState);
      expect(result).toEqual({
        unPlanned: [SUB1],
        planned: [SUB_S],
      } as any);
    });

    it('should add sub tasks of planned parents', () => {
      const P = {
        id: 'P',
        subTaskIds: ['SUB1', 'SUB_S'],
        tagIds: [],
        plannedAt: 12345,
        reminderId: 'HAXX',
      };
      const SUB1 = {
        id: 'SUB1',
        subTaskIds: [],
        tagIds: [],
        parentId: P.id,
      };
      const SUB_S = {
        id: 'SUB_S',
        plannedAt: 1234,
        reminderId: 'HA',
        parentId: P.id,
        subTaskIds: [],
        tagIds: [],
      };

      const initialState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector(initialState);
      expect(result).toEqual({
        unPlanned: [],
        planned: [{ ...SUB1, plannedAt: P.plannedAt }, SUB_S],
      } as any);
    });

    it('should not show done tasks', () => {
      const P = {
        id: 'P',
        subTaskIds: ['SUB1', 'SUB_S'],
        tagIds: [],
      };
      const SUB1 = {
        id: 'SUB1',
        subTaskIds: [],
        tagIds: [],
        parentId: P.id,
        isDone: true,
      };
      const SUB_S = {
        id: 'SUB_S',
        plannedAt: 1234,
        reminderId: 'HA',
        parentId: P.id,
        subTaskIds: [],
        tagIds: [],
        isDone: true,
      };

      const initialState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector(initialState);
      expect(result).toEqual({
        unPlanned: [],
        planned: [],
      } as any);
    });
  });
});
