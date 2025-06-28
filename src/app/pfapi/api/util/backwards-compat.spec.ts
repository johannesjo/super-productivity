import { LocalMeta, RemoteMeta } from '../pfapi.model';
import {
  getLocalChangeCounter,
  getLastSyncedChangeCounter,
  setLocalChangeCounter,
  setLastSyncedChangeCounter,
  createBackwardsCompatibleMeta,
  getVectorClock,
  getLastSyncedVectorClock,
  setVectorClock,
  setLastSyncedVectorClock,
  hasVectorClocks,
} from './backwards-compat';

describe('backwards-compat', () => {
  describe('getLocalChangeCounter', () => {
    it('should prefer new field name when both are present', () => {
      const meta: Partial<LocalMeta> = {
        localLamport: 10,
        localChangeCounter: 15,
      };
      expect(getLocalChangeCounter(meta as LocalMeta)).toBe(15);
    });

    it('should use old field name when new is not present', () => {
      const meta: Partial<LocalMeta> = {
        localLamport: 10,
      };
      expect(getLocalChangeCounter(meta as LocalMeta)).toBe(10);
    });

    it('should return 0 when neither field is present', () => {
      const meta: Partial<LocalMeta> = {};
      expect(getLocalChangeCounter(meta as LocalMeta)).toBe(0);
    });

    it('should handle undefined old field', () => {
      const meta: Partial<LocalMeta> = {
        localLamport: undefined as any,
        localChangeCounter: 5,
      };
      expect(getLocalChangeCounter(meta as LocalMeta)).toBe(5);
    });
  });

  describe('getLastSyncedChangeCounter', () => {
    it('should prefer new field name when both are present', () => {
      const meta: Partial<LocalMeta> = {
        lastSyncedLamport: 10,
        lastSyncedChangeCounter: 15,
      };
      expect(getLastSyncedChangeCounter(meta as LocalMeta)).toBe(15);
    });

    it('should use old field name when new is not present', () => {
      const meta: Partial<LocalMeta> = {
        lastSyncedLamport: 10,
      };
      expect(getLastSyncedChangeCounter(meta as LocalMeta)).toBe(10);
    });

    it('should return null when neither field is present', () => {
      const meta: Partial<LocalMeta> = {};
      expect(getLastSyncedChangeCounter(meta as LocalMeta)).toBeNull();
    });

    it('should handle null values correctly', () => {
      const meta: Partial<LocalMeta> = {
        lastSyncedLamport: null,
        lastSyncedChangeCounter: null,
      };
      expect(getLastSyncedChangeCounter(meta as LocalMeta)).toBeNull();
    });
  });

  describe('setLocalChangeCounter', () => {
    it('should set both old and new field names', () => {
      const meta: Partial<LocalMeta> = {};
      setLocalChangeCounter(meta as LocalMeta, 25);
      expect(meta.localLamport).toBe(25);
      expect(meta.localChangeCounter).toBe(25);
    });

    it('should update existing values', () => {
      const meta: Partial<LocalMeta> = {
        localLamport: 10,
        localChangeCounter: 10,
      };
      setLocalChangeCounter(meta as LocalMeta, 30);
      expect(meta.localLamport).toBe(30);
      expect(meta.localChangeCounter).toBe(30);
    });
  });

  describe('setLastSyncedChangeCounter', () => {
    it('should set both old and new field names', () => {
      const meta: Partial<LocalMeta> = {};
      setLastSyncedChangeCounter(meta as LocalMeta, 25);
      expect(meta.lastSyncedLamport).toBe(25);
      expect(meta.lastSyncedChangeCounter).toBe(25);
    });

    it('should handle null values', () => {
      const meta: Partial<LocalMeta> = {
        lastSyncedLamport: 10,
        lastSyncedChangeCounter: 10,
      };
      setLastSyncedChangeCounter(meta as LocalMeta, null);
      expect(meta.lastSyncedLamport).toBeNull();
      expect(meta.lastSyncedChangeCounter).toBeNull();
    });
  });

  describe('createBackwardsCompatibleMeta', () => {
    it('should populate old field from new field', () => {
      const meta: Partial<LocalMeta> = {
        localChangeCounter: 15,
        lastSyncedChangeCounter: 12,
        lastUpdate: 1000,
        revMap: {},
        crossModelVersion: 1,
      };
      const result = createBackwardsCompatibleMeta(meta as LocalMeta);
      expect(result.localLamport).toBe(15);
      expect(result.lastSyncedLamport).toBe(12);
    });

    it('should populate new field from old field', () => {
      const meta: Partial<LocalMeta> = {
        localLamport: 20,
        lastSyncedLamport: 18,
        lastUpdate: 1000,
        revMap: {},
        crossModelVersion: 1,
      };
      const result = createBackwardsCompatibleMeta(meta as LocalMeta);
      expect(result.localChangeCounter).toBe(20);
      expect(result.lastSyncedChangeCounter).toBe(18);
    });

    it('should not override existing values', () => {
      const meta: Partial<LocalMeta> = {
        localLamport: 10,
        localChangeCounter: 10,
        lastSyncedLamport: 8,
        lastSyncedChangeCounter: 8,
      };
      const result = createBackwardsCompatibleMeta(meta as LocalMeta);
      expect(result.localLamport).toBe(10);
      expect(result.localChangeCounter).toBe(10);
      expect(result.lastSyncedLamport).toBe(8);
      expect(result.lastSyncedChangeCounter).toBe(8);
    });

    it('should handle RemoteMeta type', () => {
      const meta: Partial<RemoteMeta> = {
        localLamport: 25,
        lastUpdate: 2000,
        revMap: {},
        crossModelVersion: 1,
        mainModelData: {},
      };
      const result = createBackwardsCompatibleMeta(meta as RemoteMeta);
      expect(result.localChangeCounter).toBe(25);
      expect(result.localLamport).toBe(25);
    });

    it('should preserve all other fields', () => {
      const meta: LocalMeta = {
        localLamport: 10,
        lastSyncedLamport: 8,
        lastUpdate: 1500,
        lastUpdateAction: 'test action',
        revMap: { model1: 'rev1' },
        crossModelVersion: 2,
        lastSyncedUpdate: 1400,
        metaRev: 'meta-rev-1',
        lastSyncedAction: 'sync action',
      };
      const result = createBackwardsCompatibleMeta(meta);
      expect(result.lastUpdate).toBe(1500);
      expect(result.lastUpdateAction).toBe('test action');
      expect(result.revMap).toEqual({ model1: 'rev1' });
      expect(result.crossModelVersion).toBe(2);
      expect(result.lastSyncedUpdate).toBe(1400);
      expect(result.metaRev).toBe('meta-rev-1');
      expect(result.lastSyncedAction).toBe('sync action');
    });
  });

  describe('Vector Clock Functions', () => {
    const createBaseMeta = (): LocalMeta => ({
      localLamport: 0,
      lastUpdate: 0,
      lastSyncedUpdate: null,
      lastSyncedLamport: null,
      revMap: {},
      metaRev: null,
      crossModelVersion: 1,
    });

    describe('getVectorClock', () => {
      it('should return existing vector clock', () => {
        const meta = createBaseMeta();
        meta.vectorClock = { client1: 5, client2: 3 };
        const result = getVectorClock(meta, 'client1');
        expect(result).toEqual({ client1: 5, client2: 3 });
      });

      it('should migrate from Lamport timestamp', () => {
        const meta = createBaseMeta();
        meta.localLamport = 7;
        const result = getVectorClock(meta, 'client1');
        expect(result).toEqual({ client1: 7 });
      });

      it('should migrate from localChangeCounter', () => {
        const meta = createBaseMeta();
        meta.localChangeCounter = 9;
        const result = getVectorClock(meta, 'client1');
        expect(result).toEqual({ client1: 9 });
      });

      it('should return undefined for zero Lamport', () => {
        const meta = createBaseMeta();
        meta.localLamport = 0;
        const result = getVectorClock(meta, 'client1');
        expect(result).toBeUndefined();
      });

      it('should return undefined when no data available', () => {
        const meta = createBaseMeta();
        const result = getVectorClock(meta, 'client1');
        expect(result).toBeUndefined();
      });

      it('should not return empty vector clock', () => {
        const meta = createBaseMeta();
        meta.vectorClock = {};
        const result = getVectorClock(meta, 'client1');
        expect(result).toBeUndefined();
      });
    });

    describe('getLastSyncedVectorClock', () => {
      it('should return existing last synced vector clock', () => {
        const meta = createBaseMeta();
        meta.lastSyncedVectorClock = { client1: 4, client2: 2 };
        const result = getLastSyncedVectorClock(meta, 'client1');
        expect(result).toEqual({ client1: 4, client2: 2 });
      });

      it('should migrate from last synced Lamport', () => {
        const meta = createBaseMeta();
        meta.lastSyncedLamport = 6;
        const result = getLastSyncedVectorClock(meta, 'client1');
        expect(result).toEqual({ client1: 6 });
      });

      it('should migrate from lastSyncedChangeCounter', () => {
        const meta = createBaseMeta();
        meta.lastSyncedChangeCounter = 8;
        const result = getLastSyncedVectorClock(meta, 'client1');
        expect(result).toEqual({ client1: 8 });
      });

      it('should return null for null Lamport', () => {
        const meta = createBaseMeta();
        meta.lastSyncedLamport = null;
        const result = getLastSyncedVectorClock(meta, 'client1');
        expect(result).toBe(null);
      });

      it('should return null for zero Lamport', () => {
        const meta = createBaseMeta();
        meta.lastSyncedLamport = 0;
        const result = getLastSyncedVectorClock(meta, 'client1');
        expect(result).toBe(null);
      });
    });

    describe('setVectorClock', () => {
      it('should set vector clock and update Lamport', () => {
        const meta = createBaseMeta();
        const vectorClock = { client1: 10, client2: 5 };
        setVectorClock(meta, vectorClock, 'client1');

        expect(meta.vectorClock).toEqual(vectorClock);
        expect(meta.localLamport).toBe(10);
        expect(meta.localChangeCounter).toBe(10);
      });

      it('should use 0 for missing client component', () => {
        const meta = createBaseMeta();
        const vectorClock = { client2: 5 };
        setVectorClock(meta, vectorClock, 'client1');

        expect(meta.vectorClock).toEqual(vectorClock);
        expect(meta.localLamport).toBe(0);
        expect(meta.localChangeCounter).toBe(0);
      });

      it('should handle empty vector clock', () => {
        const meta = createBaseMeta();
        const vectorClock = {};
        setVectorClock(meta, vectorClock, 'client1');

        expect(meta.vectorClock).toEqual({});
        expect(meta.localLamport).toBe(0);
        expect(meta.localChangeCounter).toBe(0);
      });
    });

    describe('setLastSyncedVectorClock', () => {
      it('should set last synced vector clock and update Lamport', () => {
        const meta = createBaseMeta();
        const vectorClock = { client1: 8, client2: 4 };
        setLastSyncedVectorClock(meta, vectorClock, 'client1');

        expect(meta.lastSyncedVectorClock).toEqual(vectorClock);
        expect(meta.lastSyncedLamport).toBe(8);
        expect(meta.lastSyncedChangeCounter).toBe(8);
      });

      it('should handle null vector clock', () => {
        const meta = createBaseMeta();
        meta.lastSyncedLamport = 5;
        meta.lastSyncedChangeCounter = 5;
        setLastSyncedVectorClock(meta, null, 'client1');

        expect(meta.lastSyncedVectorClock).toBe(null);
        expect(meta.lastSyncedLamport).toBeNull();
        expect(meta.lastSyncedChangeCounter).toBeNull();
      });

      it('should use 0 for missing client component', () => {
        const meta = createBaseMeta();
        const vectorClock = { client2: 4 };
        setLastSyncedVectorClock(meta, vectorClock, 'client1');

        expect(meta.lastSyncedVectorClock).toEqual(vectorClock);
        expect(meta.lastSyncedLamport).toBe(0);
        expect(meta.lastSyncedChangeCounter).toBe(0);
      });
    });

    describe('hasVectorClocks', () => {
      it('should return true when both have non-empty vector clocks', () => {
        const local: LocalMeta = {
          ...createBaseMeta(),
          vectorClock: { client1: 5 },
        };
        const remote: RemoteMeta = {
          ...createBaseMeta(),
          vectorClock: { client2: 3 },
          mainModelData: {},
        };
        expect(hasVectorClocks(local, remote)).toBe(true);
      });

      it('should return false when local missing vector clock', () => {
        const local = createBaseMeta();
        const remote: RemoteMeta = {
          ...createBaseMeta(),
          vectorClock: { client2: 3 },
          mainModelData: {},
        };
        expect(hasVectorClocks(local, remote)).toBe(false);
      });

      it('should return false when remote missing vector clock', () => {
        const local: LocalMeta = {
          ...createBaseMeta(),
          vectorClock: { client1: 5 },
        };
        const remote: RemoteMeta = {
          ...createBaseMeta(),
          mainModelData: {},
        };
        expect(hasVectorClocks(local, remote)).toBe(false);
      });

      it('should return false when both have empty vector clocks', () => {
        const local: LocalMeta = {
          ...createBaseMeta(),
          vectorClock: {},
        };
        const remote: RemoteMeta = {
          ...createBaseMeta(),
          vectorClock: {},
          mainModelData: {},
        };
        expect(hasVectorClocks(local, remote)).toBe(false);
      });

      it('should return false when one has empty vector clock', () => {
        const local: LocalMeta = {
          ...createBaseMeta(),
          vectorClock: {},
        };
        const remote: RemoteMeta = {
          ...createBaseMeta(),
          vectorClock: { client1: 5 },
          mainModelData: {},
        };
        expect(hasVectorClocks(local, remote)).toBe(false);
      });
    });
  });
});
