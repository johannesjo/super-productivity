import {NgxRxdbCollectionConfig} from '../../../core/rxdb/ngx-rxdb.interface';

export async function percentageDoneFn() {
  const allDocs = await this.find().exec();
  return allDocs.filter(doc => !!doc.done).length / allDocs.length;
}

const collectionMethods = {
  percentageDone: percentageDoneFn,
};

// declare var require: any;
// FIXME: can we just import json here?
// isDevMode ? require('../../../assets/data/todo.schema.json')
const tasksSchema = {
  definitions: {},
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Todo',
  description: 'Todo Schema',
  required: ['guid', 'name'],
  version: 0,
  properties: {
    guid: {
      type: 'string',
      title: 'Id',
      primary: true,
      pattern: '^(.*)$',
    },
    name: {
      type: 'string',
      title: 'Todo',
    },
    done: {
      type: 'boolean',
      title: 'Done',
    },
    dateCreated: {
      type: 'number',
      title: 'Date Created',
      index: true,
    },
  },
};

export const TASKS_SCHEMA: NgxRxdbCollectionConfig = {
  name: 'task',
  schema: tasksSchema,
  statics: collectionMethods,
  options: {
    schemaUrl: 'assets/data/tasks.schema.json',
    initialDocs: [
      {
        guid: 'ac3ef2c6-c98b-43e1-9047-71d68b1f92f4',
        name: 'Open Todo list example',
        done: true,
        dateCreated: 1546300800000,
      },
      {
        guid: 'a4c6a479-7cca-4d3b-ab90-45d3eaa957f3',
        name: 'Check the other examples',
        done: false,
        dateCreated: 1548979200000,
      },
      {
        guid: 'a4c6a479-7cca-4d3b-bc10-45d3eaa957r5',
        name: 'Use Angular ngRx Material Starter in your project',
        done: false,
        dateCreated: Date.now(),
      },
    ],
  },
};
