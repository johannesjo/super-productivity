import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectActivePluginId } from '../../../core-ui/layout/store/layout.reducer';
import { PluginIndexComponent } from '../plugin-index/plugin-index.component';
import { PluginLog } from '../../../core/log';

/**
 * Container component for rendering plugin iframes in the right panel.
 * Handles plugin loading, error states, and message communication.
 */
@Component({
  selector: 'plugin-panel-container',
  standalone: true,
  imports: [PluginIndexComponent],
  template: `
    @if (activePluginId()) {
      <plugin-index
        [directPluginId]="activePluginId()!"
        [showFullUI]="false"
        [useSidePanelConfig]="true"
      ></plugin-index>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        position: relative;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginPanelContainerComponent implements OnInit, OnDestroy {
  private _store = inject(Store);

  readonly activePluginId = signal<string | null>(null);

  private _subs = new Subscription();

  ngOnInit(): void {
    // Subscribe to active plugin ID from layout state
    this._subs.add(
      this._store
        .select(selectActivePluginId)
        .pipe(filter((pluginId): pluginId is string => !!pluginId))
        .subscribe((pluginId) => {
          PluginLog.log('Plugin panel container received active plugin ID:', pluginId);
          this.activePluginId.set(pluginId);
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }
}
