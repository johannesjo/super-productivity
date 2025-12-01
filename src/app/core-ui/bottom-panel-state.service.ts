import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BottomPanelStateService {
  readonly isOpen = signal(false);
}
