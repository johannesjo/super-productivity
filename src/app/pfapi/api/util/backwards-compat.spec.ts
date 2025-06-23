import { LocalMeta, RemoteMeta } from '../pfapi.model';
import {
  getLocalChangeCounter,
  getLastSyncedChangeCounter,
  setLocalChangeCounter,
  setLastSyncedChangeCounter,
  createBackwardsCompatibleMeta,
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
});
