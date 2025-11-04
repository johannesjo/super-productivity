import { Injectable } from '@angular/core';
import { LS } from '../../core/persistence/storage-keys.const';

@Injectable({ providedIn: 'root' })
export class FocusModeStorageService {
  getLastCountdownDuration(): number | null {
    const raw = localStorage.getItem(LS.LAST_COUNTDOWN_DURATION);
    if (!raw) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  setLastCountdownDuration(duration: number): void {
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    localStorage.setItem(LS.LAST_COUNTDOWN_DURATION, duration.toString());
  }
}
