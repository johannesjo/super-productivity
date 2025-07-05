import { LocalMeta, RemoteMeta } from '../pfapi.model';
import { getVectorClock, hasVectorClocks } from './backwards-compat';

describe('backwards-compat', () => {
  const createBaseMeta = (): LocalMeta => ({
    lastUpdate: 0,
    lastSyncedUpdate: null,
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

    it('should return null when no data available', () => {
      const meta = createBaseMeta();
      const result = getVectorClock(meta, 'client1');
      expect(result).toBeNull();
    });

    it('should return null for empty vector clock', () => {
      const meta = createBaseMeta();
      meta.vectorClock = {};
      const result = getVectorClock(meta, 'client1');
      expect(result).toBeNull();
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
