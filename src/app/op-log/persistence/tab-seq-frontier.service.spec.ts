import { TabSeqFrontierService } from './tab-seq-frontier.service';

describe('TabSeqFrontierService (#9438)', () => {
  let service: TabSeqFrontierService;

  beforeEach(() => {
    service = new TabSeqFrontierService();
  });

  it('defaults open while no frontier is established (pre-#9438 behavior)', () => {
    expect(service.isSaveSafeAt(0)).toBe(true);
    expect(service.isSaveSafeAt(42)).toBe(true);
  });

  it('ignores own writes before a frontier is established', () => {
    service.observeOwnWrite(7);
    expect(service.isSaveSafeAt(7)).toBe(true);
    expect(service.isSaveSafeAt(99)).toBe(true);
  });

  it('is safe exactly at the established frontier', () => {
    service.establishFrontier(10);
    expect(service.isSaveSafeAt(10)).toBe(true);
    expect(service.isSaveSafeAt(11)).toBe(false);
    expect(service.isSaveSafeAt(9)).toBe(false);
  });

  it('advances contiguously through own writes', () => {
    service.establishFrontier(10);
    service.observeOwnWrite(11);
    service.observeOwnWrite(12);
    expect(service.isSaveSafeAt(12)).toBe(true);
  });

  it('ignores re-observed (idempotent) seqs at or below the frontier', () => {
    service.establishFrontier(10);
    service.observeOwnWrite(10);
    service.observeOwnWrite(5);
    expect(service.isSaveSafeAt(10)).toBe(true);
  });

  it('detects a foreign interleave when an own write skips a seq — and stays diverged even though the scalars align again', () => {
    service.establishFrontier(4);
    // Another tab took seq 5; our own append returned 6.
    service.observeOwnWrite(6);
    // Global max now equals what we last wrote — the unsound scalar check
    // would pass here and bake an anchor past the unapplied foreign op 5.
    expect(service.isSaveSafeAt(6)).toBe(false);
  });

  it('stays diverged across further contiguous own writes', () => {
    service.establishFrontier(4);
    service.observeOwnWrite(6);
    service.observeOwnWrite(7);
    expect(service.isSaveSafeAt(7)).toBe(false);
  });

  it('clears divergence on the next establish (re-hydration / baseline install)', () => {
    service.establishFrontier(4);
    service.observeOwnWrite(6);
    service.establishFrontier(6);
    expect(service.isSaveSafeAt(6)).toBe(true);
  });

  it('falls back to default-open after a reset (ops wipe)', () => {
    service.establishFrontier(4);
    service.observeOwnWrite(6);
    service.resetToUnestablished();
    expect(service.isSaveSafeAt(0)).toBe(true);
  });

  it('is unsafe when the global max moved past the frontier without any own write (pure foreign append)', () => {
    service.establishFrontier(10);
    expect(service.isSaveSafeAt(12)).toBe(false);
  });
});
