// tslint:disable:ban-types
import { RxJsonSchema } from 'rxdb';
import { NgxRxdbCollectionConfig } from './ngx-rxdb.interface';

function idLengthFn() {
  return this.primary.length;
}

async function countAllDocumentsFn() {
  const allDocs = await this.find().exec();
  return allDocs.length;
}

export const DEFAULT_INSTANCE_METHODS: { [key: string]: Function } = {
  idLength: idLengthFn,
};
export const DEFAULT_COLLECTION_METHODS: { [key: string]: Function } = {
  countAllDocuments: countAllDocumentsFn,
};

export class NgxRxdbCollectionCreator implements NgxRxdbCollectionConfig {
  name: string;
  schema: RxJsonSchema;
  migrationStrategies?: NgxRxdbCollectionConfig['migrationStrategies'];
  statics?: NgxRxdbCollectionConfig['statics'];
  methods?: NgxRxdbCollectionConfig['methods'];
  attachments?: NgxRxdbCollectionConfig['attachments'];
  options?: NgxRxdbCollectionConfig['options'];

  constructor(config: NgxRxdbCollectionConfig) {
    Object.assign(this, {
      ...config,
      methods: { ...DEFAULT_INSTANCE_METHODS, ...config.methods },
      statics: { ...DEFAULT_COLLECTION_METHODS, ...config.statics },
    });
  }
}
