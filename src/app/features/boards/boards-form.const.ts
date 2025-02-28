import { LimitedFormlyFieldConfig } from '../config/global-config.model';
import { BoardCfg, BoardPanelCfg } from './boards.model';
import { nanoid } from 'nanoid';

const getNewPanel = (): BoardPanelCfg => ({
  id: nanoid(),
  title: '',
  isDoneOnly: false,
  isUnDoneOnly: false,
  taskIds: [],
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
    key: 'rows',
    type: 'input',
    templateOptions: {
      // label: T.F.GITEA.FORM.TOKEN,
      label: 'Rows',
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
          type: 'checkbox',
          key: 'isDoneOnly',
          templateOptions: {
            expressions: {
              hide: 'model.isUndoneOnly',
            },
            label: 'Limit to done tasks',
            // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
          },
        },
        // TODO check why not working properly
        {
          type: 'checkbox',
          key: 'isUndoneOnly',
          expressions: {
            hide: 'model.isDoneOnly',
          },
          templateOptions: {
            label: 'Limit to undone tasks',
            // label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
          },
        },
      ],
    },
  },
];
