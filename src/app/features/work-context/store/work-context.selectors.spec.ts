import { TODAY_TAG } from '../../tag/tag.const';
import { fakeEntityStateFromArray } from '../../../util/fake-entity-state-from-array';
import {
  selectActiveWorkContext,
  selectStartableTasksForActiveContext,
  selectTimelineTasks,
} from './work-context.selectors';
import { WorkContext, WorkContextType } from '../work-context.model';

describe('workContext selectors', () => {
  describe('selectActiveWorkContext', () => {
    it('should select today tag', () => {
      const result = selectActiveWorkContext.projector(
        {
          activeId: TODAY_TAG.id,
          activeType: WorkContextType.TAG,
        },
        fakeEntityStateFromArray([]),
        fakeEntityStateFromArray([TODAY_TAG]),
      );
      expect(result).toEqual(
        jasmine.objectContaining({
          advancedCfg: {
            worklogExportSettings: {
              cols: ['DATE', 'START', 'END', 'TIME_CLOCK', 'TITLES_INCLUDING_SUB'],
              groupBy: 'DATE',
              roundEndTimeTo: null,
              roundStartTimeTo: null,
              roundWorkTimeTo: null,
              separateTasksBy: ' | ',
            },
          },
          breakNr: {},
          breakTime: {},
          color: null,
          // created: 1620997370531,
          icon: 'wb_sunny',
          id: 'TODAY',
          // modified: 1620997370531,
          routerLink: 'tag/TODAY',
          taskIds: [],
          theme: {
            accent: '#ff4081',
            backgroundImageDark: 'assets/bg/NIGHT_manuel-will.jpg',
            backgroundImageLight: null,
            hueAccent: '500',
            huePrimary: '500',
            hueWarn: '500',
            isAutoContrast: true,
            isDisableBackgroundGradient: false,
            primary: '#6495ED',
            warn: '#e11826',
          },
          title: 'Today',
          type: 'TAG',
          workEnd: {},
          workStart: {},
        }),
      );
    });
  });
  describe('selectStartableTasksForActiveContext', () => {
    it('should select tasks for project', () => {
      const M1 = {
        id: 'M1',
        tagIds: [TODAY_TAG.id],
        subTaskIds: [],
      };
      const M2 = {
        id: 'M2',
        subTaskIds: [],
        tagIds: [TODAY_TAG.id],
        plannedAt: 1234,
        reminderId: 'asd',
      };
      const ctx: Partial<WorkContext> = {
        id: TODAY_TAG.id,
        taskIds: [M1.id, M2.id],
      };
      const result = selectStartableTasksForActiveContext.projector(
        ctx,
        fakeEntityStateFromArray([M2, M1]).entities,
      );
      expect(result).toEqual([
        { id: 'M1', subTaskIds: [], tagIds: ['TODAY'] },
        {
          id: 'M2',
          plannedAt: 1234,
          reminderId: 'asd',
          subTaskIds: [],
          tagIds: ['TODAY'],
        },
      ] as any[]);
    });
  });

  describe('selectTimelineTasks', () => {
    it('should return planned and unplanned tasks', () => {
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
      const taskState = fakeEntityStateFromArray([P1, P2]) as any;
      const result = selectTimelineTasks.projector([P1], taskState);
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

      const taskState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector([SUB1], taskState);
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

      const taskState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector([SUB1, SUB_S], taskState);
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

      const taskState = fakeEntityStateFromArray([P, SUB1, SUB_S]) as any;
      const result = selectTimelineTasks.projector([SUB1, SUB_S], taskState);
      expect(result).toEqual({
        unPlanned: [],
        planned: [],
      } as any);
    });
  });
});
