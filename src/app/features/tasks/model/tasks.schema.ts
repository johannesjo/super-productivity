import {NgxRxdbCollectionConfig} from '../../../core/rxdb/ngx-rxdb.interface';
import {IssueProviderKey} from '../../issue/issue';
import {ShowSubTasksMode, TimeSpentOnDay} from '../task.model';
import * as taskSchema from '../../../../assets/data/tasks.schema.json';
export async function percentageDoneFn() {
  const allDocs = await this.find().exec();
  return allDocs.filter(doc => !!doc.done).length / allDocs.length;
}

const collectionMethods = {
  percentageDone: percentageDoneFn,
};

export const TASKS_SCHEMA: NgxRxdbCollectionConfig = {
  name: 'task',
  // tslint:disable-next-line
  schema: taskSchema['default'],
  statics: collectionMethods,
  options: {
    schemaUrl: 'assets/data/tasks.schema.json',
    initialDocs: [

    ],
  },
};
