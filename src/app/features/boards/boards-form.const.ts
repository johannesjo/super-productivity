import { LimitedFormlyFieldConfig } from '../config/global-config.model';
import {
  BoardCfg,
  BoardPanelCfg,
  BoardPanelCfgScheduledState,
  BoardPanelCfgTaskDoneState,
} from './boards.model';
import { nanoid } from 'nanoid';
import { T } from '../../t.const';

const getNewPanel = (): BoardPanelCfg => ({
  id: nanoid(),
  title: '',
  taskIds: [],

  taskDoneState: BoardPanelCfgTaskDoneState.All,
  excludedTagIds: [],
  includedTagIds: [],
  scheduledState: BoardPanelCfgScheduledState.All,
  isParentTasksOnly: false,
  projectId: '',
});

export const BOARDS_FORM: LimitedFormlyFieldConfig<BoardCfg>[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      label: T.G.TITLE,
      type: 'text',
      required: true,
    },
  },
  {
    key: 'cols',
    type: 'input',
    templateOptions: {
      label: T.F.BOARDS.FORM.COLUMNS,
      required: true,
      type: 'number',
    },
  },

  // ---------- Panels ----------
  {
    key: 'panels',
    type: 'repeat',
    className: 'simple-counters',
    templateOptions: {
      addText: T.F.BOARDS.FORM.ADD_NEW_PANEL,
      getInitialValue: getNewPanel,
    },
    fieldArray: {
      fieldGroup: [
        {
          type: 'input',
          key: 'title',
          templateOptions: {
            label: T.G.TITLE,
            required: true,
          },
        },
        {
          type: 'tag-select',
          key: 'includedTagIds',
          expressions: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'props.excludedTagIds': 'model.excludedTagIds',
          },
          templateOptions: {
            label: T.F.BOARDS.FORM.TAGS_REQUIRED,
          },
        },
        {
          type: 'tag-select',
          key: 'excludedTagIds',
          expressions: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'props.excludedTagIds': 'model.includedTagIds',
          },
          templateOptions: {
            label: T.F.BOARDS.FORM.TAGS_EXCLUDED,
          },
        },
        {
          key: 'taskDoneState',
          type: 'radio',
          props: {
            label: T.F.BOARDS.FORM.TASK_DONE_STATE,
            required: true,
            defaultValue: BoardPanelCfgTaskDoneState.All,
            options: [
              {
                value: BoardPanelCfgTaskDoneState.All,
                label: T.F.BOARDS.FORM.TASK_DONE_STATE_ALL,
              },
              {
                value: BoardPanelCfgTaskDoneState.Done,
                label: T.F.BOARDS.FORM.TASK_DONE_STATE_DONE,
              },
              {
                value: BoardPanelCfgTaskDoneState.UnDone,
                label: T.F.BOARDS.FORM.TASK_DONE_STATE_UNDONE,
              },
            ],
          },
        },
        {
          key: 'scheduledState',
          type: 'radio',
          props: {
            // label: T.F.BOARDS.FORM.TASK_DONE_STATE,
            label: 'Scheduled State',
            required: true,
            defaultValue: BoardPanelCfgScheduledState.All,
            options: [
              {
                value: BoardPanelCfgScheduledState.All,
                // label: T.F.BOARDS.FORM.TASK_DONE_STATE_ALL,
                label: 'All',
              },
              {
                value: BoardPanelCfgScheduledState.Scheduled,
                // label: T.F.BOARDS.FORM.TASK_DONE_STATE_DONE,
                label: 'Scheduled',
              },
              {
                value: BoardPanelCfgScheduledState.NotScheduled,
                // label: T.F.BOARDS.FORM.TASK_DONE_STATE_UNDONE,
                label: 'Not Scheduled',
              },
            ],
          },
        },
        {
          key: 'projectId',
          type: 'project-select',
          props: {
            // label: T.GCF.MISC.DEFAULT_PROJECT,
            label: 'Project',
            defaultValue: '',
            // nullLabel: T.F,
            nullLabel: 'All Projects',
          },
        },
        {
          key: 'isParentTasksOnly',
          type: 'checkbox',
          props: {
            // label: T.GCF.MISC.DEFAULT_PROJECT,
            label: 'Only parent tasks',
            defaultValue: false,
          },
        },
      ],
    },
  },
];
