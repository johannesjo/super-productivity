import { LimitedFormlyFieldConfig } from '../config/global-config.model';
import { BoardCfg, BoardPanelCfg, BoardPanelCfgTaskDoneState } from './boards.model';
import { nanoid } from 'nanoid';

const getNewPanel = (): BoardPanelCfg => ({
  id: nanoid(),
  title: '',
  taskIds: [],
  taskDoneState: BoardPanelCfgTaskDoneState.All,
  excludedTagIds: [],
  includedTagIds: [],
});

export const BOARDS_FORM: LimitedFormlyFieldConfig<BoardCfg>[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      // label: T.F.GITEA.FORM.HOST,
      label: 'Title',
      type: 'text',
      required: true,
    },
  },
  {
    key: 'cols',
    type: 'input',
    templateOptions: {
      // label: T.F.GITEA.FORM.TOKEN,
      label: 'Columns',
      required: true,
      type: 'number',
    },
  },

  {
    key: 'panels',
    type: 'repeat',
    className: 'simple-counters',
    templateOptions: {
      // addText: T.F.SIMPLE_COUNTER.FORM.ADD_NEW,
      addText: 'Add new panel',
      getInitialValue: getNewPanel,
    },
    fieldArray: {
      fieldGroup: [
        {
          type: 'input',
          key: 'title',
          templateOptions: {
            // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
            // TODO global translation G.TITLE
            label: 'Title',
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
            label: 'Required Tags',
            // description: 'Added to task when moved to this panel',
            // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
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
            label: 'Excluded Tags',
            // description: 'Removed from task when moved to this panel',
            // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
          },
        },
        {
          key: 'taskDoneState',
          type: 'radio',
          props: {
            label: 'Task Done State',
            required: true,
            defaultValue: BoardPanelCfgTaskDoneState.All,
            options: [
              { value: BoardPanelCfgTaskDoneState.All, label: 'All' },
              { value: BoardPanelCfgTaskDoneState.Done, label: 'Done' },
              { value: BoardPanelCfgTaskDoneState.UnDone, label: 'Undone' },
            ],
          },
        },

        // {
        //   type: 'checkbox',
        //   key: 'isDoneOnly',
        //   expressions: {
        //     hide: 'model.isUnDoneOnly',
        //   },
        //   templateOptions: {
        //     getInitialValue: () => false,
        //     label: 'Limit to done tasks',
        //     // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
        //   },
        // },
        // // TODO check why not working properly
        // {
        //   type: 'checkbox',
        //   key: 'isUnDoneOnly',
        //   expressions: {
        //     hide: 'model.isDoneOnly',
        //   },
        //   templateOptions: {
        //     getInitialValue: () => false,
        //     label: 'Limit to undone tasks',
        //     // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
        //   },
        // },
      ],
    },
  },
];
