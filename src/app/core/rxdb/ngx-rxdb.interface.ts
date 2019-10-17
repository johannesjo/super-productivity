import { RxCollectionCreator, RxDatabaseCreator } from 'rxdb';

export interface NgxRxdbCollectionConfig extends RxCollectionCreator {
  options?: {
    schemaUrl: string;
    initialDocs?: any[];
    [key: string]: any;
  };
}

export interface NgxRxdbConfig extends Partial<RxDatabaseCreator> {
  options?: {
    schemas?: NgxRxdbCollectionConfig[];
    dumpPath?: string;
    [key: string]: any;
  };
}

export interface NgxRxdbDump {
  name: string;
  instanceToken?: string;
  encrypted?: boolean;
  passwordHash?: string;
  collections: {[key: string]: any};
  timestamp: number;
}
