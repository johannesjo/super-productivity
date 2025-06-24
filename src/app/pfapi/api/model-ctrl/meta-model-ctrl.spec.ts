import { MetaModelCtrl } from './meta-model-ctrl';
import { Database } from '../db/database';
import { PFEventEmitter } from '../util/events';
import { LocalMeta, ModelCfg } from '../pfapi.model';
import { DEFAULT_META_MODEL } from './meta-model-ctrl';
import { InvalidMetaError } from '../errors/errors';

describe('MetaModelCtrl', () => {
  let metaModelCtrl: MetaModelCtrl;
  let mockDb: jasmine.SpyObj<Database>;
  let mockEventEmitter: jasmine.SpyObj<PFEventEmitter>;
  const crossModelVersion = 4.1;

  beforeEach(() => {
    mockDb = jasmine.createSpyObj('Database', ['save', 'load']);
    mockEventEmitter = jasmine.createSpyObj('PFEventEmitter', ['emit']);

    // Default behavior for load - return null initially for meta, but return client ID
    mockDb.load.and.callFake(<T = unknown>(key: string): Promise<T | void> => {
      if (key === MetaModelCtrl.CLIENT_ID) {
        return Promise.resolve('test-client-id' as any);
      }
      return Promise.resolve(null as any);
    });
    mockDb.save.and.returnValue(Promise.resolve());

    metaModelCtrl = new MetaModelCtrl(mockDb, mockEventEmitter, crossModelVersion);
  });

  describe('initialization', () => {
    it('should initialize with default meta model values', async () => {
      const meta = await metaModelCtrl.load();

      expect(meta).toEqual({
        ...DEFAULT_META_MODEL,
        crossModelVersion,
      });
      expect(meta.localLamport).toBe(0);
      expect(meta.lastSyncedLamport).toBe(null);
    });

    it('should load existing meta model from database', async () => {
      const existingMeta: LocalMeta = {
        crossModelVersion: 4.1,
        revMap: { model1: '123' },
        lastUpdate: 1000,
        metaRev: 'rev1',
        lastSyncedUpdate: 1000,
        localLamport: 5,
        lastSyncedLamport: 5,
      };

      mockDb.load.and.callFake(<T = unknown>(key: string): Promise<T | void> => {
        if (key === MetaModelCtrl.CLIENT_ID) {
          return Promise.resolve('test-client-id' as any);
        }
        return Promise.resolve(existingMeta as any);
      });

      const newCtrl = new MetaModelCtrl(mockDb, mockEventEmitter, crossModelVersion);
      const meta = await newCtrl.load();

      expect(meta).toEqual(existingMeta);
    });
  });

  describe('updateRevForModel', () => {
    let testCtrl: MetaModelCtrl;

    beforeEach(async () => {
      // Initialize with some data
      const initialMeta: LocalMeta = {
        crossModelVersion: 4.1,
        revMap: {},
        lastUpdate: 1000,
        metaRev: null,
        lastSyncedUpdate: null,
        localLamport: 5,
        lastSyncedLamport: null,
      };
      mockDb.load.and.callFake(<T = unknown>(key: string): Promise<T | void> => {
        if (key === MetaModelCtrl.CLIENT_ID) {
          return Promise.resolve('test-client-id' as any);
        }
        return Promise.resolve(initialMeta as any);
      });

      // Create a new controller and wait for it to load
      testCtrl = new MetaModelCtrl(mockDb, mockEventEmitter, crossModelVersion);
      await testCtrl.load();

      // Reset the spy call count after initialization
      mockDb.save.calls.reset();
    });

    it('should increment localLamport when updating a model', async () => {
      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: false,
        isMainFileModel: false,
      };

      await testCtrl.updateRevForModel('testModel', modelCfg);

      expect(mockDb.save).toHaveBeenCalledWith(
        MetaModelCtrl.META_MODEL_ID,
        jasmine.objectContaining({
          localLamport: 6, // Should increment from 5 to 6
        }),
        false,
      );
    });

    it('should set lastUpdateAction when updating a model', async () => {
      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: false,
        isMainFileModel: false,
      };

      await testCtrl.updateRevForModel('testModel', modelCfg);

      expect(mockDb.save).toHaveBeenCalledWith(
        MetaModelCtrl.META_MODEL_ID,
        jasmine.objectContaining({
          lastUpdateAction: jasmine.stringMatching(/^testModel => \d{4}-\d{2}-\d{2}T/),
        }),
        false,
      );
    });

    it('should not update for local-only models', async () => {
      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: true,
        isMainFileModel: false,
      };

      await testCtrl.updateRevForModel('testModel', modelCfg);

      expect(mockDb.save).not.toHaveBeenCalled();
    });

    it('should update revMap for non-main file models', async () => {
      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: false,
        isMainFileModel: false,
      };

      await testCtrl.updateRevForModel('testModel', modelCfg);

      expect(mockDb.save).toHaveBeenCalledWith(
        MetaModelCtrl.META_MODEL_ID,
        jasmine.objectContaining({
          revMap: jasmine.objectContaining({
            testModel: jasmine.any(String),
          }),
        }),
        false,
      );
    });

    it('should not update revMap for main file models', async () => {
      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: false,
        isMainFileModel: true,
      };

      await testCtrl.updateRevForModel('mainModel', modelCfg);

      const savedMeta = mockDb.save.calls.mostRecent().args[1] as LocalMeta;
      expect(savedMeta.revMap).toEqual({});
    });

    it('should emit events after update', async () => {
      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: false,
        isMainFileModel: false,
      };

      await testCtrl.updateRevForModel('testModel', modelCfg);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'metaModelChange',
        jasmine.any(Object),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'syncStatusChange',
        'UNKNOWN_OR_CHANGED',
      );
    });

    it('should handle missing localLamport gracefully', async () => {
      // Load meta without Lamport fields (simulating old data)
      const oldMeta: LocalMeta = {
        crossModelVersion: 4.1,
        revMap: {},
        lastUpdate: 1000,
        metaRev: null,
        lastSyncedUpdate: null,
        localLamport: undefined as any,
        lastSyncedLamport: undefined as any,
      };
      mockDb.load.and.callFake(<T = unknown>(key: string): Promise<T | void> => {
        if (key === MetaModelCtrl.CLIENT_ID) {
          return Promise.resolve('test-client-id' as any);
        }
        return Promise.resolve(oldMeta as any);
      });

      const newCtrl = new MetaModelCtrl(mockDb, mockEventEmitter, crossModelVersion);
      await newCtrl.load();

      // Reset spy to ignore initialization saves
      mockDb.save.calls.reset();

      const modelCfg: ModelCfg<any> = {
        defaultData: {},
        isLocalOnly: false,
        isMainFileModel: false,
      };

      await newCtrl.updateRevForModel('testModel', modelCfg);

      expect(mockDb.save).toHaveBeenCalledWith(
        MetaModelCtrl.META_MODEL_ID,
        jasmine.objectContaining({
          localLamport: 1, // Should start from 0 + 1
        }),
        false,
      );
    });
  });

  describe('save', () => {
    it('should validate and save meta model', async () => {
      const metaToSave: LocalMeta = {
        crossModelVersion: 4.1,
        revMap: {},
        lastUpdate: 2000,
        metaRev: 'rev2',
        lastSyncedUpdate: 2000,
        localLamport: 10,
        lastSyncedLamport: 10,
      };

      await metaModelCtrl.save(metaToSave);

      expect(mockDb.save).toHaveBeenCalledWith(
        MetaModelCtrl.META_MODEL_ID,
        metaToSave,
        false,
      );
    });

    it('should throw error if lastUpdate is not a number', async () => {
      const invalidMeta: LocalMeta = {
        crossModelVersion: 4.1,
        revMap: {},
        lastUpdate: null as any,
        metaRev: null,
        lastSyncedUpdate: null,
        localLamport: 0,
        lastSyncedLamport: null,
      };

      await expectAsync(metaModelCtrl.save(invalidMeta)).toBeRejectedWithError(
        InvalidMetaError,
      );
    });
  });
});
