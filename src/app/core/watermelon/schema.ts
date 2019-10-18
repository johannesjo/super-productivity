import {appSchema, tableSchema} from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        {name: 'title', type: 'string', isIndexed: true},
        {name: 'created', type: 'string', isIndexed: true},
        // { name: 'subtitle', type: 'string', isOptional: true },
        // { name: 'body', type: 'string' },
        // { name: 'is_pinned', type: 'boolean' },
      ]
    }),
    // tableSchema({
    //   name: 'tasks',
    //   columns: [
    //     {name: 'title', type: 'string'},
    //     { name: 'subtitle', type: 'string', isOptional: true },
    //     { name: 'body', type: 'string' },
    //     { name: 'is_pinned', type: 'boolean' },
    // ]
    // }),
  ]
});


