import { TestBed } from '@angular/core/testing';
import { FocusModeStorageService } from './focus-mode-storage.service';
import { LS } from '../../core/persistence/storage-keys.const';

describe('FocusModeStorageService', () => {
  let service: FocusModeStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FocusModeStorageService);
    localStorage.clear();
  });

  it('should return null when storage is empty', () => {
    expect(service.getLastCountdownDuration()).toBeNull();
  });

  it('should read stored duration value', () => {
    localStorage.setItem(LS.LAST_COUNTDOWN_DURATION, '42000');

    expect(service.getLastCountdownDuration()).toBe(42_000);
  });

  it('should ignore invalid values', () => {
    localStorage.setItem(LS.LAST_COUNTDOWN_DURATION, 'not-a-number');

    expect(service.getLastCountdownDuration()).toBeNull();
  });

  it('should persist positive durations', () => {
    service.setLastCountdownDuration(30_000);

    expect(localStorage.getItem(LS.LAST_COUNTDOWN_DURATION)).toBe('30000');
  });

  it('should ignore non-positive durations when persisting', () => {
    localStorage.setItem(LS.LAST_COUNTDOWN_DURATION, '30000');

    service.setLastCountdownDuration(0);

    expect(localStorage.getItem(LS.LAST_COUNTDOWN_DURATION)).toBe('30000');
  });
});
